import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Lazy load route components for code splitting
const HomePage = lazy(() => import('./components/HomePage'));
const ICS212Form = lazy(() => import('./components/ICS212Form'));
const ICS212AdminDashboard = lazy(() => import('./components/admin/ICS212AdminDashboard').then(m => ({ default: m.ICS212AdminDashboard })));

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
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Main ICS-212 Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/form" element={<ICS212Form />} />
            <Route path="/admin" element={<ICS212AdminDashboard />} />
            
            {/* Redirect old routes to new structure */}
            <Route path="/inspection" element={<Navigate to="/form" replace />} />
            <Route path="/ics212" element={<Navigate to="/form" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
