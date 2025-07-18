'use client';

import { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import LoginScreen from '../components/LoginScreen';
import { login } from '../lib/api';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('tasky_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (password: string) => {
    try {
      const { token } = await login(password);
      localStorage.setItem('tasky_token', token);
      setIsAuthenticated(true);
    } catch (error) {
      alert('Login failed. Please check your password and try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tasky_token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-xl text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
}
