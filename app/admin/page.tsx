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

  // Login
  const handleLogin = () => {
    if (adminPassword.length < 4) return alert('Ingresa la contraseña');
    setIsAuthenticated(true);
    loadConfig();
  };

  // Cargar keys desde backend
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await res.json();
      setGeminiKeys(data.geminiKeys || []);
      setGroqKeys(data.groqKeys || []);
      setPriority(data.priority || ['gemini', 'groq']);
    } catch (err) {
      alert('Error al cargar las keys desde Upstash');
    }
    setLoading(false);
  };

  // Guardar configuración
  const saveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword 
        },
        body: JSON.stringify({ geminiKeys, groqKeys, priority })
      });

      if (res.ok) {
        setMessage('✅ Configuración guardada correctamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert('Error al guardar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
    setLoading(false);
  };

  const addKey = (type: 'gemini' | 'groq') => {
    const input = document.getElementById(type === 'gemini' ? 'geminiInput' : 'groqInput') as HTMLInputElement;
    const value = input.value.trim();
    if (!value) return;

    if (type === 'gemini') {
      setGeminiKeys([...geminiKeys, value]);
    } else {
      setGroqKeys([...groqKeys, value]);
    }
    input.value = '';
  };

  const removeKey = (type: 'gemini' | 'groq', index: number) => {
    if (type === 'gemini') {
      setGeminiKeys(geminiKeys.filter((_, i) => i !== index));
    } else {
      setGroqKeys(groqKeys.filter((_, i) => i !== index));
    }
  };

  // Tester
  const sendTest = async () => {
    if (!testApiKey) return alert('Ingresa una API Key para probar');
    setIsTesting(true);
    setTestOutput('Enviando...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: testProvider,
          apiKey: testApiKey,
          model: testModel,
          systemPrompt: "Eres un asistente útil.",
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
              if (data.chunk) output += data.chunk;
              if (data.error) output += `\nError: ${data.error}`;
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
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h1>🔐 AI Router - Admin</h1>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Contraseña de administrador"
          style={{ padding: '12px', width: '320px', margin: '20px 0', fontSize: '16px' }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <br />
        <button onClick={handleLogin} style={{ padding: '12px 30px' }}>Entrar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>AI Router - Dashboard de Administración</h1>
      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

      <div style={{ margin: '25px 0' }}>
        <button onClick={() => setActiveTab('keys')} style={{ padding: '10px 20px', marginRight: '10px', background: activeTab === 'keys' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'keys' ? 'white' : 'black', borderRadius: '6px' }}>
          Gestión de Keys
        </button>
        <button onClick={() => setActiveTab('tester')} style={{ padding: '10px 20px', background: activeTab === 'tester' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'tester' ? 'white' : 'black', borderRadius: '6px' }}>
          Tester en Vivo
        </button>
      </div>

      {activeTab === 'keys' && (
        <div>
          <h2>Gestión de API Keys</h2>

          <div style={{ marginBottom: '40px' }}>
            <h3>Gemini Keys ({geminiKeys.length}/4)</h3>
            <input id="geminiInput" type="text" placeholder="Pega una nueva API Key de Gemini" style={{ width: '100%', padding: '12px', marginBottom: '10px' }} />
            <button onClick={() => addKey('gemini')} style={{ padding: '8px 16px' }}>Agregar Gemini Key</button>
            
            <ul style={{ marginTop: '15px' }}>
              {geminiKeys.map((key, i) => (
                <li key={i} style={{ margin: '8px 0', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
                  Gemini Key #{i+1} ••••••••{key.slice(-6)}
                  <button onClick={() => removeKey('gemini', i)} style={{ marginLeft: '15px', color: 'red', float: 'right' }}>Eliminar</button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h3>Groq Keys ({groqKeys.length}/5)</h3>
            <input id="groqInput" type="text" placeholder="Pega una nueva API Key de Groq" style={{ width: '100%', padding: '12px', marginBottom: '10px' }} />
            <button onClick={() => addKey('groq')} style={{ padding: '8px 16px' }}>Agregar Groq Key</button>
            
            <ul style={{ marginTop: '15px' }}>
              {groqKeys.map((key, i) => (
                <li key={i} style={{ margin: '8px 0', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
                  Groq Key #{i+1} ••••••••{key.slice(-6)}
                  <button onClick={() => removeKey('groq', i)} style={{ marginLeft: '15px', color: 'red', float: 'right' }}>Eliminar</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Prioridad de Proveedores</h3>
            <select value={priority[0]} onChange={(e) => setPriority([e.target.value, priority[1] === e.target.value ? priority[0] : priority[1]])} style={{ padding: '10px', width: '300px' }}>
              <option value="gemini">Gemini primero → Groq</option>
              <option value="groq">Groq primero → Gemini</option>
            </select>
          </div>

          <button onClick={saveConfig} disabled={loading} style={{ marginTop: '30px', padding: '14px 32px', background: '#3b82f6', color: 'white', borderRadius: '8px' }}>
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      )}

      {activeTab === 'tester' && (
        <div>
          <h2>Tester en Vivo</h2>
          {/* El tester se puede completar después si lo deseas */}
          <p>El tester se activará completamente una vez que las keys se guarden correctamente.</p>
        </div>
      )}
    </div>
  );
}
