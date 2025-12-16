import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { APPARATUS_LIST, FORMS_MANAGEMENT_ENABLED, WORKER_URL } from '../lib/config';
import { useApparatusStatus } from '../hooks/useApparatusStatus';
import type { Rank, Shift, User, Apparatus } from '../types';

const ranks: Rank[] = ['Firefighter', 'DE', 'Lieutenant', 'Captain', 'Chief'];
const shifts: Shift[] = ['A', 'B', 'C'];

// MBFD Personnel Names - Alphabetically sorted
const MBFD_PERSONNEL = [
  'J. Abay Jr.',
  'A. Albaladejo Jr.',
  'E. Aleman',
  'G. Almeyda',
  'M. Almodovar',
  'J. Alonso',
  'D. Amion',
  'A. Amoruso',
  'N. Ancheta',
  'D. Anderson',
  'S. Anderson',
  'D. Antoine',
  'J. Azcoitia',
  'J. Barnett',
  'T. Barreto',
  'A. Barrett',
  'R. Basallo',
  'J. Batista',
  'M. Bedell',
  'F. Betancourt',
  'D. Bell',
  'P. Bermejo',
  'J. Bishop',
  'B. Bloomfield',
  'J. Bogk',
  'T. Bowman',
  'C. Brown',
  'M. Bueno',
  'J. Bugay',
  'R. Burns',
  'C. Cadet',
  'J. Calderon',
  'T. Campbell',
  'N. Cantillo',
  'D. Cardenas',
  'J. Caride',
  'P. Carrillo',
  'C. Cash',
  'J. Cauble',
  'E. Cento',
  'C. Chavez',
  'I. Chavez',
  'E. Chiroles',
  'B. Chin',
  'K. Cooley',
  'M. Coppo',
  'A. Correa',
  'N. Costa',
  'D. Crespo',
  'C. Crato',
  'D. Cruzado',
  'R. Cruzado',
  'D. Curbelo',
  'P. Darley Jr.',
  'D. Diaz',
  'R. Diaz',
  'J. Dorleus',
  'C. Duncan',
  'D. Escobar',
  'D. Escudero',
  'R. Erbs II',
  'H. Estrada',
  'D. Ferguson',
  'D. Fernandez',
  'J. Fernandez',
  'D. Fernandez Jr.',
  'R. Fernandez',
  'P. Fernandez',
  'M. Fisikelli',
  'J. Flores',
  'J. Florio Jr',
  'D. Fiorito',
  'D. Frazier Jr.',
  'R. Futterman',
  'D. Gato',
  'B. Garcia',
  'A. Garcia',
  'D. Garcia',
  'G. Garcia',
  'A. Glassman',
  'A. Gomez',
  'M. Gomez',
  'N. Gomez',
  'P. Gonzalez',
  'R. Gonzalez',
  'A. Grullon',
  'D. Guerrero',
  'D. Hargis',
  'O. Hanna',
  'D. Henry',
  'A. Hernandez',
  'M. Hernandez',
  'R. Hernandez',
  'Z. Hirsch',
  'J. Hirnyk',
  'M. Horta',
  'R. Hume',
  'M. Ingram',
  'M. Jean-Louis',
  'P. Johnson',
  'J. Keit',
  'D. Keller',
  'K. Kohan',
  'C. Lang',
  'B. Layton',
  'T. Ledwidge II',
  'D. Lewis II',
  'O. Lima',
  'A. Lopez',
  'A. Loubet',
  'A. Madore',
  'K. Marshall',
  'C. Martin',
  'D. Martinez',
  'A. Martinez',
  'S. Martinez',
  'J. Martell',
  'P. Maturell',
  'A. Mederos',
  'P. Mejia',
  'N. Melendres',
  'C. Merein',
  'J. Mila',
  'C. Mila',
  'A. Miro',
  'J. Mizelle',
  'N. Montes De Oca',
  'M. Morejon',
  'G. Munoz',
  'C. Navas',
  'D. Nicholas',
  'J. Nichols',
  'D. Nodarse',
  'D. Nemorin',
  'C. Nunez',
  'A. Nunez',
  'R. Obregon',
  'I. Ochoa',
  'J. Ospina',
  'A. Ortega',
  'Z. Orvin',
  'D. Page',
  'M. Peralta',
  'D. Perez',
  'A. Perez',
  'K. Phelan',
  'S. Pineiro',
  'J. Piedra',
  'E. Prentiss',
  'B. Prentice',
  'C. Price',
  'A. Prol',
  'R. Quintela',
  'P. Radio',
  'M. Ramirez',
  'E. Ramirez',
  'R. Rapado',
  'R. Rayneri',
  'K. Reyes',
  'M. Rico',
  'J. Rivero',
  'C. Rodriguez Jr',
  'M. Rodriguez',
  'G. Rocher',
  'C. Rojas',
  'C. Romulus',
  'M. Rose',
  'M. Saavedra',
  'J. Saintil',
  'J. Sanda',
  'A. Sanchez',
  'R. Sanchez',
  'M. Sanchez',
  'R. Sanchez',
  'A. Santos',
  'J. Santis',
  'M. Sanford',
  'C. Seidner',
  'M. Shwel',
  'M. Schwartz',
  'M. Sica',
  'D. Soares',
  'D. Sola',
  'J. Sola',
  'T. Sola',
  'J. Sorger',
  'K. Speers',
  'K. Stephens',
  'J. Sturman',
  'J. Sujo',
  'A. Swasey',
  'J. Talavera',
  'D. Thompson',
  'M. Thompson',
  'J. Torres',
  'W. Trentacosta',
  'J. Triana',
  'J. Varela',
  'S. Vasquez',
  'M. Vega',
  'H. Viera',
  'M. Viera',
  'C. Vinuela',
  'T. Vinuela',
  'C. Wells',
  'M. Williams',
  'A. Wilson',
  'T. Wong',
  'D. Yocum Jr',
  'R. Yuhr',
];

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { getVehicleNumber } = useApparatusStatus();
  const [user, setUser] = useState<User>({
    name: '',
    rank: 'Firefighter',
    apparatus: 'Rescue 1',
    shift: 'A',
    unitNumber: 'R1',
  });
  const [validationError, setValidationError] = useState('');
  const [apparatusOptions, setApparatusOptions] = useState<string[]>(APPARATUS_LIST);

  // Fetch dynamic apparatus list if feature is enabled
  useEffect(() => {
    if (FORMS_MANAGEMENT_ENABLED) {
      fetch(`${WORKER_URL}/api/apparatus`)
        .then(res => res.json())
        .then(data => {
          if (data.apparatus && data.apparatus.length > 0) {
            setApparatusOptions(data.apparatus);
            console.log('Loaded apparatus list from API');
          }
        })
        .catch(err => {
          console.error('Failed to fetch apparatus list:', err);
          // Falls back to APPARATUS_LIST if fetch fails
        });
    }
  }, []);

  // Auto-populate vehicle number when apparatus changes (with debouncing to prevent freezes)
  useEffect(() => {
    // Debounce the vehicle number lookup to prevent rapid state updates during apparatus switching
    const timeoutId = setTimeout(() => {
      const vehicleNo = getVehicleNumber(user.apparatus);
      if (vehicleNo) {
        setUser((prev) => ({ ...prev, unitNumber: vehicleNo }));
      }
    }, 100); // 100ms debounce

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [user.apparatus, getVehicleNumber]);

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
      <Card className="max-w-md w-full shadow-2xl animate-fade-in">
        <CardContent className="py-8 px-6">
          {/* Logo/Header */}
          <div className="text-center mb-8 animate-slide-down">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-xl overflow-hidden">
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
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-2xl p-4 mb-6 text-center shadow-inner animate-scale-in">
            <p className="text-sm text-gray-700 font-bold mb-1">SELECTED APPARATUS</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent">{user.apparatus.toUpperCase()}</p>
            <p className="text-xs text-gray-600 mt-1 font-medium">Daily Equipment Inspection</p>
          </div>

          {/* Form */}
          <div className="space-y-4 stagger-fade-in">
            {/* Name Input with Autocomplete */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-800 mb-2">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                list="personnel-names"
                value={user.name}
                onChange={(e) => {
                  setUser({ ...user, name: e.target.value });
                  setValidationError('');
                }}
                placeholder="Enter or select your name"
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-600 outline-none transition-all text-base font-medium placeholder-gray-400 bg-white text-gray-900"
                autoComplete="off"
              />
              <datalist id="personnel-names">
                {MBFD_PERSONNEL.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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
                  {apparatusOptions.map((apparatus) => (
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
              className="w-full mt-6 h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 haptic-medium btn-press"
              size="lg"
            >
              Start Inspection →
            </Button>

            {/* Admin Link */}
            <div className="text-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // Use window.location.hash for more reliable navigation with HashRouter
                  window.location.hash = '#/admin';
                }}
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