import { SignIn, SignUp } from '@clerk/clerk-react';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AuthScreenProps {
  mode: 'sign-in' | 'sign-up';
  isClerkConfigured: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ mode, isClerkConfigured }) => {
  const location = useLocation();
  const isSignUp = mode === 'sign-up' || location.pathname.startsWith('/sign-up');

  const clerkAppearance = {
    variables: {
      colorPrimary: '#10b981', // emerald-500
      colorBackground: '#121215',
      colorInputBackground: '#09090b',
      colorInputText: '#ffffff',
      colorText: '#ffffff',
      colorTextSecondary: '#a1a1aa',
      colorDanger: '#ef4444',
      colorSuccess: '#10b981',
      borderRadius: '0.75rem',
      fontFamily: 'inherit',
    },
    elements: {
      rootBox: 'w-full',
      card: 'bg-[#121215] border border-white/[0.08] shadow-2xl text-white rounded-2xl p-6 sm:p-8',
      headerTitle: 'text-white text-lg font-bold tracking-tight',
      headerSubtitle: 'text-zinc-400 text-xs',
      socialButtonsBlockButton:
        'bg-white/[0.04] border border-white/[0.08] text-zinc-200 hover:bg-white/[0.08] text-xs font-medium rounded-xl py-2.5 transition',
      formButtonPrimary:
        'bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-2.5 rounded-xl transition shadow-sm',
      formFieldInput:
        'bg-[#09090b] border border-white/[0.08] text-white text-xs rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 py-2.5 transition',
      formFieldLabel: 'text-zinc-300 text-xs font-medium',
      footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-medium',
      footerActionText: 'text-zinc-400 text-xs',
      identityPreviewText: 'text-zinc-300 text-xs',
      identityPreviewEditButton: 'text-emerald-400 hover:text-emerald-300',
      dividerLine: 'bg-white/[0.08]',
      dividerText: 'text-zinc-500 text-[11px] uppercase tracking-wider',
      otpCodeFieldInputs: 'gap-2 my-3',
      otpCodeFieldInput:
        'bg-[#09090b] border border-white/[0.15] text-white text-lg font-mono rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-12 text-center',
      formResendCodeLink: 'text-emerald-400 hover:text-emerald-300 text-xs font-medium',
      alert: 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-3 text-xs mb-4',
      alertText: 'text-red-300 text-xs',
    },
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative">
      {/* Ambient Radial Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <img
              src="https://entrywise.webbound.in/assets/logo.png"
              alt="Logo"
              className="w-10 h-10 rounded-xl border border-white/[0.1] shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">EntryWise Console</h1>
          <p className="text-xs text-zinc-400">
            Sign in to manage form endpoints, inspect submissions, and configure webhooks
          </p>
        </div>

        {/* In-App Tab Switcher */}
        <div className="flex bg-[#121215] p-1 rounded-xl border border-white/[0.08] text-xs font-medium">
          <Link
            to="/sign-in"
            className={`flex-1 text-center py-2 rounded-lg transition ${
              !isSignUp
                ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            className={`flex-1 text-center py-2 rounded-lg transition ${
              isSignUp
                ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </Link>
        </div>

        {/* Clerk Auth Component Rendered In-App */}
        <div className="flex justify-center w-full">
          {!isClerkConfigured ? (
            <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs space-y-2 text-center w-full">
              <div className="font-semibold">Clerk Publishable Key Missing</div>
              <p className="text-zinc-400">
                Please set <code className="text-white font-mono">VITE_CLERK_PUBLISHABLE_KEY</code>{' '}
                in <code className="text-white font-mono">apps/app/.env</code> to enable
                authentication.
              </p>
            </div>
          ) : isSignUp ? (
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/"
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/"
              appearance={clerkAppearance}
            />
          )}
        </div>
      </div>
    </div>
  );
};
