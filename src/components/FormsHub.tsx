import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TouchFeedback } from './mobile/TouchFeedback';
import { Lock, ClipboardCheck, Truck, ArrowLeft } from 'lucide-react';

interface FormCardProps {
  title: string;
  subtitle: string;
  description: string;
  path: string;
  locked: boolean;
  icon: React.ReactNode;
  badgeColor: string;
  iconBgColor: string;
  onClick: () => void;
}

function FormCard({ title, subtitle, description, locked, icon, badgeColor, iconBgColor, onClick }: FormCardProps) {
  return (
    <TouchFeedback>
      <button
        onClick={onClick}
        className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-left hover:shadow-3xl hover:scale-[1.02] transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`${iconBgColor} rounded-lg p-3`}>
            {icon}
          </div>
          {locked ? (
            <span className={`text-sm font-medium ${badgeColor} px-3 py-1 rounded-full flex items-center gap-1`}>
              <Lock className="w-3 h-3" />
              Password Required
            </span>
          ) : (
            <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              Open Access
            </span>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          {subtitle}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {description}
        </p>
        
        <div className={`flex items-center font-semibold ${locked ? badgeColor.replace('bg-', 'text-').replace('/30', '') : 'text-blue-600 dark:text-blue-400'}`}>
          <span>Access Form</span>
          <span className="ml-2 text-xl">→</span>
        </div>
      </button>
    </TouchFeedback>
  );
}

export function FormsHub() {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleICS218Access = () => {
    // Check if user already has access token
    const token = sessionStorage.getItem('ics218_access_token');
    if (token) {
      navigate('/ics218');
    } else {
      setShowPasswordModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0066FF] to-[#0052CC]">
      <div className="container mx-auto px-4 py-12">
        {/* Header with logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <img 
            src="/taskforce-io-logo.png" 
            alt="TASKFORCE IO" 
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold text-white mb-2">Forms Hub</h1>
          <p className="text-white/90 text-lg">Select a form to get started</p>
        </motion.div>
        
        {/* Grid of form cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {/* ICS 212 Card */}
          <FormCard 
            title="ICS 212"
            subtitle="Vehicle Safety Inspection"
            description="Create and manage vehicle safety inspection forms with digital signatures and automatic PDF generation."
            path="/form"
            locked={false}
            icon={<ClipboardCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
            badgeColor="text-blue-600 dark:text-blue-400"
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            onClick={() => navigate('/form')}
          />
          
          {/* ICS 218 Card */}
          <FormCard 
            title="ICS 218"
            subtitle="Support Vehicle/Equipment Inventory"
            description="Manage support vehicle and equipment inventory for incident operations with comprehensive tracking."
            path="/ics218"
            locked={true}
            icon={<Truck className="w-8 h-8 text-orange-600 dark:text-orange-400" />}
            badgeColor="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30"
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            onClick={handleICS218Access}
          />
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center space-x-4 text-sm text-white/80">
            <span>✓ Auto-save</span>
            <span>•</span>
            <span>✓ Offline mode</span>
            <span>•</span>
            <span>✓ PDF export</span>
          </div>
        </motion.div>
      </div>

      {/* Password Modal for ICS 218 */}
      {showPasswordModal && (
        <PasswordModal 
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            navigate('/ics218');
          }}
        />
      )}
    </div>
  );
}

// Password Modal Component for ICS 218
function PasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsValidating(true);

    try {
      const correctPassword = 'ICS218Deploy2026!';
      
      if (password === correctPassword) {
        const token = `session_ics218_${Date.now()}`;
        sessionStorage.setItem('ics218_access_token', token);
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
            <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
              <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ICS 218 Access
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
          This form requires a password to access. Please enter the ICS 218 deployment password.
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Access Form'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default FormsHub;