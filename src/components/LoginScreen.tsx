'use client';

import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-7xl font-black text-gray-900 mb-4 tracking-tight">
            tasky
          </h1>
          <p className="text-xl text-gray-500 font-light">
            Welcome to the new era of productivity
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-6 py-4 text-lg font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                placeholder="Password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-8 py-4 bg-gray-900 text-white font-semibold text-lg rounded-2xl hover:bg-gray-800 transition-all duration-200"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen; 