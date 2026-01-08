import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AdminAuth } from './components/admin/AdminAuth';
import { ICS218Auth } from './components/ics218/ICS218Auth';

// Lazy load route components for code splitting
const HomePage = lazy(() => import('./components/HomePage'));
const FormsHub = lazy(() => import('./components/FormsHub'));
const ICS212Form = lazy(() => import('./components/ICS212Form'));
const ICS218Form = lazy(() => import('./components/ics218/ICS218Form'));
const ICS212AdminDashboard = lazy(() => import('./components/admin/ICS212AdminDashboard').then(m => ({ default: m.ICS212AdminDashboard })));
const DashboardHome = lazy(() => import('./components/admin/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));

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
            {/* Main Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/forms" element={<FormsHub />} />
            <Route path="/form" element={<ICS212Form />} />
            <Route 
              path="/ics218" 
              element={
                <ICS218Auth>
                  <ICS218Form />
                </ICS218Auth>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminAuth>
                  <DashboardHome />
                </AdminAuth>
              } 
            />
            <Route 
              path="/admin/forms" 
              element={
                <AdminAuth>
                  <ICS212AdminDashboard />
                </AdminAuth>
              } 
            />
            
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
