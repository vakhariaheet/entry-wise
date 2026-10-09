import { ClerkProvider } from '@clerk/clerk-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const isClerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY?.startsWith('pk_'));

/**
 * Safe fallback screen when Clerk is not configured. It must NOT render <App />, because App calls
 * Clerk's useAuth() on mount, which throws when there is no <ClerkProvider> ancestor (previously a
 * white-screen crash, with the friendly AuthScreen notice never reached).
 */
const ClerkNotConfigured = () => (
  <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
    <div className="w-full max-w-md p-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs space-y-2 text-center">
      <div className="text-base font-semibold text-white">EntryWise Console</div>
      <div className="font-semibold">Clerk Publishable Key Missing</div>
      <p className="text-zinc-400 leading-relaxed">
        Set <code className="text-white font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
        <code className="text-white font-mono">apps/app/.env</code> to enable authentication, then
        reload.
      </p>
    </div>
  </div>
);

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

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        {isClerkConfigured ? (
          <ClerkProviderWithRouter>
            <App isClerkConfigured={true} />
          </ClerkProviderWithRouter>
        ) : (
          <ClerkNotConfigured />
        )}
      </BrowserRouter>
    </React.StrictMode>
  );
}
