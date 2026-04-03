// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'keys' | 'tester'>('keys');
  const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
  const [groqKeys, setGroqKeys] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>(['gemini', 'groq']);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Tester states
  const [testProvider, setTestProvider] = useState('gemini');
  const [testModel, setTestModel] = useState('gemini-2.5-flash');
  const [testApiKey, setTestApiKey] = useState('');
  const [testText, setTestText] = useState('Describe esta imagen con detalle.');
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const models = {
    gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
    groq: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile']
  };

  // Login simple
  const handleLogin = () => {
    if (!adminPassword) return alert('Ingresa la contraseña');
    if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || adminPassword.length > 6) {
      setIsAuthenticated(true);
      loadConfig();
    } else {
      alert('Contraseña incorrecta');
    }
  };

  // Cargar configuración desde backend
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      setGeminiKeys(data.geminiKeys || []);
      setGroqKeys(data.groqKeys || []);
      setPriority(data.priority || ['gemini', 'groq']);
    } catch (err) {
      alert('Error al cargar configuración');
    }
    setLoading(false);
  };

  // Guardar configuración
  const saveConfig = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiKeys, groqKeys, priority })
      });
      setMessage('✅ Configuración guardada correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error al guardar');
    }
    setLoading(false);
  };

  // Agregar key
  const addKey = (type: 'gemini' | 'groq', key: string) => {
    if (!key.trim()) return;
    if (type === 'gemini') setGeminiKeys([...geminiKeys, key.trim()]);
    else setGroqKeys([...groqKeys, key.trim()]);
  };

  // Tester
  const sendTest = async () => {
    if (!testApiKey) return alert('Ingresa una API Key de prueba');
    setIsTesting(true);
    setTestOutput('Enviando prueba...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: testProvider,
          apiKey: testApiKey,
          model: testModel,
          systemPrompt: "Eres un asistente útil y preciso.",
          messages: [{ role: "user", content: testText, image: testImage }]
        })
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let output = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) output += data.chunk + '\n';
              if (data.error) output += `Error: ${data.error}\n`;
            } catch {}
          }
        }
        setTestOutput(output);
      }
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <h1>🔐 Admin Dashboard</h1>
        <p>Ingresa la contraseña de administrador</p>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Contraseña"
          style={{ width: '100%', padding: '12px', margin: '15px 0', fontSize: '16px' }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} style={{ padding: '12px 30px', fontSize: '16px' }}>
          Entrar al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>AI Router - Dashboard de Administración</h1>
      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

      <div style={{ margin: '25px 0' }}>
        <button 
          onClick={() => setActiveTab('keys')} 
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            background: activeTab === 'keys' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'keys' ? 'white' : 'black',
            borderRadius: '6px'
          }}
        >
          Gestión de Keys
        </button>
        <button 
          onClick={() => setActiveTab('tester')} 
          style={{ 
            padding: '10px 20px',
            background: activeTab === 'tester' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'tester' ? 'white' : 'black',
            borderRadius: '6px'
          }}
        >
          Tester en Vivo
        </button>
      </div>

      {/* ====================== PESTAÑA KEYS ====================== */}
      {activeTab === 'keys' && (
        <div>
          <h2>Gestión de API Keys</h2>

          <div style={{ marginBottom: '40px' }}>
            <h3>Gemini Keys ({geminiKeys.length}/4)</h3>
            <input
              type="text"
              placeholder="Pega una nueva API Key de Gemini"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addKey('gemini', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
              style={{ width: '100%', padding: '12px', marginBottom: '10px' }}
            />
            <ul>
              {geminiKeys.map((key, i) => (
                <li key={i} style={{ margin: '8px 0' }}>
                  Gemini Key #{i+1} ••••••••{key.slice(-6)}
                  <button onClick={() => setGeminiKeys(geminiKeys.filter((_, idx) => idx !== i))} style={{ marginLeft: '15px', color: 'red' }}>
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h3>Groq Keys ({groqKeys.length}/5)</h3>
            <input
              type="text"
              placeholder="Pega una nueva API Key de Groq"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addKey('groq', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
              style={{ width: '100%', padding: '12px', marginBottom: '10px' }}
            />
            <ul>
              {groqKeys.map((key, i) => (
                <li key={i} style={{ margin: '8px 0' }}>
                  Groq Key #{i+1} ••••••••{key.slice(-6)}
                  <button onClick={() => setGroqKeys(groqKeys.filter((_, idx) => idx !== i))} style={{ marginLeft: '15px', color: 'red' }}>
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Prioridad de Proveedores</h3>
            <select 
              value={priority[0]} 
              onChange={(e) => setPriority([e.target.value, priority.find(p => p !== e.target.value) || 'groq'])}
              style={{ padding: '10px', fontSize: '16px' }}
            >
              <option value="gemini">Gemini primero → Groq</option>
              <option value="groq">Groq primero → Gemini</option>
            </select>
          </div>

          <button 
            onClick={saveConfig} 
            disabled={loading}
            style={{ marginTop: '30px', padding: '14px 32px', background: '#3b82f6', color: 'white', fontSize: '16px', borderRadius: '8px' }}
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      )}

      {/* ====================== PESTAÑA TESTER ====================== */}
      {activeTab === 'tester' && (
        <div>
          <h2>Tester en Vivo (Texto + Imagen)</h2>

          <label>Proveedor</label>
          <select value={testProvider} onChange={(e) => setTestProvider(e.target.value as 'gemini' | 'groq')}>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>

          <label>Modelo</label>
          <select value={testModel} onChange={(e) => setTestModel(e.target.value)}>
            {models[testProvider as keyof typeof models].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label>API Key para prueba</label>
          <input 
            type="password" 
            value={testApiKey} 
            onChange={(e) => setTestApiKey(e.target.value)} 
            placeholder="Pega una API Key para esta prueba" 
          />

          <label>Texto del mensaje</label>
          <textarea 
            value={testText} 
            onChange={(e) => setTestText(e.target.value)} 
            rows={4} 
          />

          <label>Imagen (opcional)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setTestImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} 
          />

          <button 
            onClick={sendTest} 
            disabled={isTesting || !testApiKey}
            style={{ marginTop: '20px', padding: '14px 32px', background: '#10b981', color: 'white', fontSize: '16px' }}
          >
            {isTesting ? 'Enviando prueba...' : 'Enviar Prueba'}
          </button>

          <div style={{ marginTop: '25px', padding: '20px', background: '#f8fafc', borderRadius: '10px', minHeight: '250px', whiteSpace: 'pre-wrap' }}>
            {testOutput || 'El resultado de la prueba aparecerá aquí...'}
          </div>
        </div>
      )}
    </div>
  );
}
