// app/admin/page.js
'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('keys');
  const [geminiKeys, setGeminiKeys] = useState([]);
  const [groqKeys, setGroqKeys] = useState([]);
  const [priority, setPriority] = useState(['gemini', 'groq']);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const models = {
    gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
    groq: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile']
  };

  const handleLogin = () => {
    if (adminPassword.length < 4) return alert('Ingresa la contraseña');
    setIsAuthenticated(true);
    loadConfig();
  };

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
      alert('Error al cargar configuración');
    }
    setLoading(false);
  };

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

  const addKey = (type) => {
    const inputId = type === 'gemini' ? 'geminiInput' : 'groqInput';
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    if (!value) return;

    if (type === 'gemini') {
      setGeminiKeys([...geminiKeys, value]);
    } else {
      setGroqKeys([...groqKeys, value]);
    }
    input.value = '';
  };

  const removeKey = (type, index) => {
    if (type === 'gemini') {
      setGeminiKeys(geminiKeys.filter((_, i) => i !== index));
    } else {
      setGroqKeys(groqKeys.filter((_, i) => i !== index));
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
            <select 
              value={priority[0]} 
              onChange={(e) => setPriority([e.target.value, priority[1] === e.target.value ? priority[0] : priority[1]])}
              style={{ padding: '10px', width: '300px' }}
            >
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
          <p>Funcionalidad de prueba disponible pronto.</p>
        </div>
      )}
    </div>
  );
}
