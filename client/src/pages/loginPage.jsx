import React, { useState } from 'react';
import api from '../services/api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login'); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!username || !password || (mode === 'register' && !name)) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        const res = await api.post('/auth/login', { username, password });
        const token = res.data?.token;
        const user = res.data?.user;
        if (token) {
          localStorage.setItem('token', token);
          if (user && user.id) localStorage.setItem('userId', user.id);
          onLogin(token);
        } else {
          setError('Login did not return token');
        }
      } else {
        const res = await api.post('/auth/register', { username, password, name });
        const token = res.data?.token;
        const user = res.data?.user;
        if (token) {
          localStorage.setItem('token', token);
          if (user && user.id) localStorage.setItem('userId', user.id);
          onLogin(token);
        } else {
          setError('Register did not return token');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
              {/* simple logo */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
              <p className="text-sm text-slate-500">{mode === 'login' ? 'Sign in to continue' : 'Join us — it only takes a minute'}</p>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-3">
            <label className="text-sm text-slate-600">Username</label>
            <input
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition shadow-sm"
              placeholder="your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            {mode === 'register' && (
              <>
                <label className="text-sm text-slate-600">Full name</label>
                <input
                  className="text-black px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition shadow-sm"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            )}

            <label className="text-sm text-slate-600">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition pr-10 shadow-sm"
                placeholder="your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.08.177-2.118.5-3.087" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                  </svg>
                )}
              </button>
            </div>

            {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2M17.657 6.343l-2.828 2.828M8.172 15.828l-2.828 2.828M17.657 17.657l-2.828-2.828M8.172 8.172L5.344 5.344" />
                </svg>
              ) : (
                <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="underline hover:text-slate-800"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
            </button>

            <button
              onClick={() => {
                setUsername('');
                setPassword('');
                setName('');
                setError('');
              }}
              className="text-xs px-2 py-1 rounded hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 border-t pt-4 text-center text-sm text-slate-500">
            <div className="mb-2">or continue with</div>
            <div className="flex items-center justify-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 hover:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M22 12a10 10 0 10-20 0 10 10 0 0020 0z" />
                </svg>
                <span className="text-xs">Google</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 hover:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 8a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
                <span className="text-xs">GitHub</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 text-xs text-slate-500 text-center border-t border-slate-100">
          By continuing you agree to our <button className="underline">Terms</button> and <button className="underline">Privacy</button>.
        </div>
      </div>
    </div>
  );
}
