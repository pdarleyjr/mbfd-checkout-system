import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Lazy load route components for code splitting
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const InspectionWizard = lazy(() => import('./components/InspectionWizard').then(m => ({ default: m.InspectionWizard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ICS212Form = lazy(() => import('./components/ICS212Form'));

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
      <p className="text-gray-600 font-semibold">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/inspection" element={<InspectionWizard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/ics212" element={<ICS212Form />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
