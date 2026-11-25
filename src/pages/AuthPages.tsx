import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Divider,
  Tab,
  TabList,
  TextInput,
  useToast,
} from '@astryxdesign/core';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme: 'outline';
          size: 'large';
          text: 'continue_with';
          shape: 'rectangular';
          logo_alignment: 'left';
          width: number;
        }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface AuthPageProps {
  mode: 'login' | 'register';
  navigate: (route: PortalRoute) => void;
}

export function AuthPage({ mode, navigate }: AuthPageProps) {
  const { signInWithGoogle, loginWithEmail, registerWithEmail, bootstrapAdmin } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<'standard' | 'admin-setup'>('standard');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleSignInRef = useRef<(idToken: string) => void>(() => undefined);

  const [bootstrapInfo, setBootstrapInfo] = useState<{
    needsAdminBootstrap: boolean;
    requiresPasscode: boolean;
    bootstrapAvailable: boolean;
    allowlistedAdminConfigured: boolean;
  }>({
    needsAdminBootstrap: false,
    requiresPasscode: true,
    bootstrapAvailable: false,
    allowlistedAdminConfigured: false,
  });

  useEffect(() => {
    fetch('/api/v1/auth/bootstrap-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setBootstrapInfo(json.data);
      })
      .catch(() => undefined);
  }, []);

  const handleGoogleCredential = (idToken: string) => {
    if (isSubmitting) return;
    setErrorMsg('');
    setIsSubmitting(true);
    void signInWithGoogle(idToken)
      .then(() => {
        toast({ body: 'Signed in with Google', type: 'info' });
        navigate('/dashboard');
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
      })
      .finally(() => setIsSubmitting(false));
  };
  googleSignInRef.current = handleGoogleCredential;

  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    const renderGoogleButton = () => {
      if (cancelled) return;
      const container = googleButtonRef.current;
      const google = window.google;
      if (!container || !google) {
        setErrorMsg('Google sign-in could not load. Check your connection and try again.');
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            googleSignInRef.current(response.credential);
          } else {
            setErrorMsg('Google did not return an ID token. Please try again.');
          }
        },
      });
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.max(200, Math.min(400, Math.floor(container.getBoundingClientRect().width))),
      });
    };

    let clientId = '';
    const handleScriptError = () => {
      if (!cancelled) setErrorMsg('Google sign-in could not load. Check your connection and try again.');
    };
    const handleScriptLoad = () => renderGoogleButton();

    const initializeGoogle = async () => {
      try {
        const response = await fetch('/api/v1/auth/google/config');
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json?.error?.message || 'Unable to load Google sign-in configuration');
        }
        clientId = json?.data?.clientId || '';
        if (!clientId) {
          setErrorMsg('Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the server.');
          return;
        }

        if (window.google) {
          renderGoogleButton();
          return;
        }

        script = document.getElementById('google-identity-services') as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement('script');
          script.id = 'google-identity-services';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
        }
        script.addEventListener('load', handleScriptLoad, { once: true });
        script.addEventListener('error', handleScriptError, { once: true });
        if (!script.isConnected) document.head.appendChild(script);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to initialize Google sign-in');
        }
      }
    };

    void initializeGoogle();
    return () => {
      cancelled = true;
      script?.removeEventListener('load', handleScriptLoad);
      script?.removeEventListener('error', handleScriptError);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (tab === 'admin-setup') {
        await bootstrapAdmin({
          name: name.trim() || 'Platform Admin',
          email: email.trim(),
          password,
          passcode,
        });
        toast({ body: 'Administrator account initialized', type: 'info' });
        navigate('/admin/lyrics');
        return;
      }

      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
        toast({ body: 'Welcome back', type: 'info' });
      } else {
        await registerWithEmail(name.trim(), email.trim(), password);
        toast({ body: 'Developer account created', type: 'info' });
      }
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          {tab === 'admin-setup'
            ? 'Claim Initial Administrator'
            : mode === 'login'
              ? 'Sign in to ZemaLyrics API'
              : 'Create Developer Account'}
        </h1>
        <p className="text-sm text-secondary">
          {mode === 'login'
            ? 'Access your API keys, analytics, and catalog console.'
            : 'Mint scoped x-api-key credentials and test endpoints live.'}
        </p>
      </div>

      {bootstrapInfo.needsAdminBootstrap && !bootstrapInfo.bootstrapAvailable && (
        <Banner
          status={bootstrapInfo.allowlistedAdminConfigured ? 'info' : 'warning'}
          title="Administrator setup is locked"
          description={
            bootstrapInfo.allowlistedAdminConfigured
              ? 'Sign in with the configured, verified Google administrator account, or configure ADMIN_PASSCODE to enable password-based setup.'
              : 'Configure ADMIN_PASSCODE with a unique random secret of at least 32 characters to enable the one-time administrator setup.'
          }
        />
      )}

      {bootstrapInfo.needsAdminBootstrap &&
        bootstrapInfo.bootstrapAvailable &&
        (
        <TabList
          value={tab}
          onChange={(v) => {
            setErrorMsg('');
            setTab(v as 'standard' | 'admin-setup');
          }}
          layout="fill"
          hasDivider
        >
          <Tab value="standard" label={mode === 'login' ? 'Sign In' : 'Developer Sign Up'} />
          <Tab value="admin-setup" label="First-Run Admin Setup" />
        </TabList>
        )}

      <Card padding={5}>
        <div className="space-y-5">
          {errorMsg && <Banner status="error" title="Authentication Error" description={errorMsg} />}

          {tab === 'admin-setup' && (
            <Banner
              status="info"
              title="One-Time Admin Claim"
              description="No administrator exists yet. Create the initial ADMIN account below; this route locks automatically once claimed."
            />
          )}

          {tab === 'standard' && (
            <>
              <div className="flex min-h-10 justify-center" aria-label="Continue with Google">
                <div ref={googleButtonRef} className="w-full" />
              </div>
              <div className="flex items-center gap-3">
                <Divider />
                <span className="text-xs text-secondary whitespace-nowrap">or with email</span>
                <Divider />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'register' || tab === 'admin-setup') && (
              <TextInput
                label="Full Name"
                placeholder="Abebe Bikila"
                value={name}
                onChange={setName}
                isRequired
                width="100%"
              />
            )}

            <TextInput
              type="email"
              label="Email Address"
              placeholder="developer@domain.com"
              value={email}
              onChange={setEmail}
              isRequired
              width="100%"
            />

            <TextInput
              type="password"
              label="Password"
              description={mode === 'register' || tab === 'admin-setup' ? 'Minimum 8 characters' : undefined}
              placeholder="Enter password"
              value={password}
              onChange={setPassword}
              isRequired
              width="100%"
            />

            {tab === 'admin-setup' && bootstrapInfo.requiresPasscode && (
              <TextInput
                type="password"
                label="Admin Setup Passcode"
                description="Use the configured 32-character minimum setup secret."
                placeholder="Enter setup passcode"
                value={passcode}
                onChange={setPasscode}
                isRequired
                width="100%"
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              width="100%"
              isLoading={isSubmitting}
              icon={tab === 'admin-setup' ? <ShieldCheck className="w-4 h-4" /> : undefined}
              label={
                tab === 'admin-setup'
                  ? 'Initialize Admin Account'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'
              }
            />
          </form>

          {tab === 'standard' && (
            <div className="text-center text-xs text-secondary pt-2">
              {mode === 'login' ? (
                <>
                  Need an API key?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-accent hover:underline font-medium cursor-pointer"
                  >
                    Register free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-accent hover:underline font-medium cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
