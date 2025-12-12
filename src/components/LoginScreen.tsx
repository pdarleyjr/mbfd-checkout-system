import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { APPARATUS_LIST } from '../lib/config';
import type { Rank, Shift, User, Apparatus } from '../types';

const ranks: Rank[] = ['Firefighter', 'DE', 'Lieutenant', 'Captain', 'Chief'];
const shifts: Shift[] = ['A', 'B', 'C'];

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>({
    name: '',
    rank: 'Firefighter',
    apparatus: 'Rescue 1',
    shift: 'A',
    unitNumber: 'R1',
  });
  const [validationError, setValidationError] = useState('');

  const handleStartInspection = () => {
    // Validate all required fields
    if (!user.name.trim()) {
      setValidationError('Please enter your name');
      return;
    }
    if (!user.unitNumber.trim()) {
      setValidationError('Please enter a unit number');
      return;
    }
    
    setValidationError('');
    
    // Store user data in session storage
    sessionStorage.setItem('user', JSON.stringify(user));
    navigate('/inspection');
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardContent className="py-8 px-6">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-xl overflow-hidden bg-white">
              <img 
                src="/mbfd-checkout-system/mbfd_logo.jpg" 
                alt="MBFD Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-1">
              MBFD Checkout
            </h1>
            <p className="text-sm text-gray-600 font-semibold mb-1">Miami Beach Fire Department</p>
            <p className="text-xs text-gray-500">{today}</p>
          </div>

          {/* Apparatus Display */}
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-2xl p-4 mb-6 text-center shadow-inner">
            <p className="text-sm text-gray-700 font-bold mb-1">SELECTED APPARATUS</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent">{user.apparatus.toUpperCase()}</p>
            <p className="text-xs text-gray-600 mt-1 font-medium">Daily Equipment Inspection</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-800 mb-2">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={user.name}
                onChange={(e) => {
                  setUser({ ...user, name: e.target.value });
                  setValidationError('');
                }}
                placeholder="Enter your full name"
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none transition-all text-base font-medium placeholder-gray-400 bg-white text-gray-900"
              />
            </div>

            {/* Apparatus Selector */}
            <div>
              <label htmlFor="apparatus" className="block text-sm font-bold text-gray-800 mb-2">
                Apparatus *
              </label>
              <div className="relative">
                <select
                  id="apparatus"
                  value={user.apparatus}
                  onChange={(e) => {
                    setUser({ ...user, apparatus: e.target.value as Apparatus });
                    setValidationError('');
                  }}
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none appearance-none bg-white transition-all text-base font-semibold text-gray-900"
                >
                  {APPARATUS_LIST.map((apparatus) => (
                    <option key={apparatus} value={apparatus}>
                      {apparatus}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Rank and Shift Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Rank Dropdown */}
              <div>
                <label htmlFor="rank" className="block text-sm font-bold text-gray-800 mb-2">
                  Rank
                </label>
                <div className="relative">
                  <select
                    id="rank"
                    value={user.rank}
                    onChange={(e) => setUser({ ...user, rank: e.target.value as Rank })}
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none appearance-none bg-white transition-all text-base font-medium text-gray-900"
                  >
                    {ranks.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Shift Dropdown */}
              <div>
                <label htmlFor="shift" className="block text-sm font-bold text-gray-800 mb-2">
                  Shift
                </label>
                <div className="relative">
                  <select
                    id="shift"
                    value={user.shift}
                    onChange={(e) => setUser({ ...user, shift: e.target.value as Shift })}
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none appearance-none bg-white transition-all text-base font-medium text-gray-900"
                  >
                    {shifts.map((shift) => (
                      <option key={shift} value={shift}>
                        Shift {shift}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Unit/Vehicle Number */}
            <div>
              <label htmlFor="unitNumber" className="block text-sm font-bold text-gray-800 mb-2">
                Unit/Vehicle # *
              </label>
              <input
                id="unitNumber"
                type="text"
                value={user.unitNumber}
                onChange={(e) => {
                  setUser({ ...user, unitNumber: e.target.value });
                  setValidationError('');
                }}
                placeholder="e.g., R1, E1, R11"
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none transition-all text-base font-medium placeholder-gray-400 bg-white text-gray-900"
              />
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 shadow-sm">
                <p className="text-sm text-red-800 font-semibold">⚠️ {validationError}</p>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartInspection}
              className="w-full mt-6 h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
              size="lg"
            >
              Start Inspection →
            </Button>

            {/* Admin Link */}
            <div className="text-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/admin')}
                className="text-sm text-blue-700 hover:text-blue-800 font-semibold transition-colors"
              >
                Admin Dashboard →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creator Badge at bottom */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-gray-700 text-xs font-semibold opacity-90 bg-white/50 backdrop-blur-sm py-2 px-4 rounded-full inline-block shadow-sm">
          Created by Peter Darley
        </p>
      </div>
    </div>
  );
};