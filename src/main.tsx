import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const queryClient = new QueryClient();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider needs router context (useNavigate), so it must live inside HashRouter */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>
);
