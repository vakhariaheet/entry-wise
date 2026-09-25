import { ClerkProvider } from '@clerk/clerk-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const isClerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY?.startsWith('pk_'));

const ClerkProviderWithRouter = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      {children}
    </ClerkProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {isClerkConfigured ? (
        <ClerkProviderWithRouter>
          <App isClerkConfigured={true} />
        </ClerkProviderWithRouter>
      ) : (
        <App isClerkConfigured={false} />
      )}
    </BrowserRouter>
  </React.StrictMode>
);
