import React, { useEffect, useState } from 'react';
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

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toast({ body: 'Signed in with Google', type: 'info' });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              ? 'Sign in with the configured, verified Firebase administrator account, or configure ADMIN_PASSCODE to enable password-based setup.'
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
              <Button
                label="Continue with Google"
                variant="secondary"
                size="lg"
                width="100%"
                isDisabled={isSubmitting}
                onClick={handleGoogleSignIn}
              />
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
