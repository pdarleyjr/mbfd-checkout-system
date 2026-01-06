import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TouchFeedback } from './mobile/TouchFeedback';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
      >
        {/* USAR Logo/Badge */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-4xl font-bold">US</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ICS-212
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Vehicle Safety Inspection
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            USAR Task Force
          </p>
        </div>

        {/* Description */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            Complete official ICS-212 WF (Wildfire) vehicle safety inspection forms 
            with digital signatures and automatic PDF generation.
          </p>
        </div>

        {/* Main Action Button */}
        <TouchFeedback>
          <button
            onClick={() => navigate('/form')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span className="text-lg">Start New Inspection</span>
            <span className="text-2xl">→</span>
          </button>
        </TouchFeedback>

        {/* Secondary Actions */}
        <div className="mt-4 space-y-2">
          <TouchFeedback>
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
            >
              Admin Dashboard
            </button>
          </TouchFeedback>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>✓ Auto-save</span>
            <span>•</span>
            <span>✓ Offline mode</span>
            <span>•</span>
            <span>✓ PDF export</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HomePage;
