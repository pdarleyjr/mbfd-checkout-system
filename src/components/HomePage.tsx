import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TouchFeedback } from './mobile/TouchFeedback';
import { Lock, ClipboardList, Settings } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleAdminAccess = () => {
    // Check if user already has access token
    const token = sessionStorage.getItem('admin_access_token');
    if (token) {
      navigate('/admin')
    } else {
      setShowPasswordModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0066FF] via-[#0059E6] to-[#0052CC] flex items-center justify-center p-4">
      <div className="max-w-7xl w-full mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <img 
              src="/taskforce-io-logo.png" 
              alt="TASKFORCE IO" 
              className="w-48 h-48 md:w-56 md:h-56 object-contain"
            />
          </div>
          <p className="text-xl text-blue-100">
            Emergency Response Document Management
          </p>
        </motion.div>

        {/* Form Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Forms Hub Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TouchFeedback>
              <button
                onClick={() => navigate('/forms')}
                className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-left hover:shadow-3xl hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                    <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    Open Access
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Forms Hub
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  Access all available forms
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Create and manage ICS 212 and ICS 218 forms with digital signatures and automatic PDF generation.
                </p>
                
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <span>View Forms</span>
                  <span className="ml-2 text-xl">→</span>
                </div>
              </button>
            </TouchFeedback>
          </motion.div>

          {/* Admin Dashboard Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TouchFeedback>
              <button
                onClick={handleAdminAccess}
                className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-left hover:shadow-3xl hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3">
                    <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Password Required
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Admin Dashboard
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  Management & Analytics
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Manage forms, vehicles, and analytics for incident operations.
                </p>
                
                <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold">
                  <span>Access Dashboard</span>
                  <span className="ml-2 text-xl">→</span>
                </div>
              </button>
            </TouchFeedback>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center space-x-4 text-sm text-blue-100">
            <span>✓ Auto-save</span>
            <span>•</span>
            <span>✓ Offline mode</span>
            <span>•</span>
            <span>✓ PDF export</span>
          </div>
        </motion.div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal 
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            navigate('/admin')
          }}
        />
      )}
    </div>
  );
}

// Password Modal Component
function PasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsValidating(true);

    try {
      // For Phase 1, we'll do client-side validation
      // Phase 3 will implement proper backend validation
      const correctPassword = 'AdminPass2026!';
      
      if (password === correctPassword) {
        // Store access token in session storage
        const token = `session_admin_${Date.now()}`;
        sessionStorage.setItem('admin_access_token', token);
        onSuccess();
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
              <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Access
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This dashboard requires a password to access. Please enter the admin password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !password}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Access Dashboard'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default HomePage;
