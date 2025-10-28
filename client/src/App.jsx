import React, { useState, useEffect } from 'react';

import LoginPage from './pages/loginPage';
import MapPage from './pages/mapPage';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // keep token in sync across browser tabs 
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'token') setToken(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleLogin(t) {
    setToken(t);
    localStorage.setItem('token', t);
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem('token');
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {!token ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <MapPage token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}