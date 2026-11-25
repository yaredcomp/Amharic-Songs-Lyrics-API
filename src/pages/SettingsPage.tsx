import React, { useState } from 'react';
import { Banner, Button, Card, Divider, Switch, TextInput, useToast } from '@astryxdesign/core';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';
import { usePortalTheme } from '../lib/theme.ts';

export function SettingsPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user, authMode, authFetch, refreshSession, updateLocalUser } = useAuth();
  const { mode, setMode } = usePortalTheme();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="space-y-4">
        <Banner
          status="info"
          title="Sign in required"
          description="Sign in to configure your developer profile and session preferences."
        />
        <Button label="Sign In" variant="primary" onClick={() => navigate('/login')} />
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: displayName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to update profile');
      updateLocalUser(json.data.user);
      toast({ body: 'Profile updated', type: 'info' });
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Update failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshToken = async () => {
    const ok = await refreshSession();
    toast({
      body: ok ? 'Session token rotated cleanly' : 'Unable to refresh token',
      type: ok ? 'info' : 'error',
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-sm text-secondary mt-1">
          Manage your developer identity, session security, and Astryx interface theme.
        </p>
      </div>

      <Card padding={5}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h2 className="text-base font-semibold text-primary">Developer Profile</h2>
          <TextInput
            label="Display Name"
            value={displayName}
            onChange={setDisplayName}
            isRequired
            width="100%"
          />
          <TextInput
            label="Email Address"
            value={user.email}
            isReadOnly
            width="100%"
          />
          <div className="text-xs text-secondary">
            Role: <span className="font-mono text-primary">{user.role}</span> · Auth provider:{' '}
            <span className="font-mono text-primary">
              {authMode === 'google' ? 'Google OAuth + JWT' : 'JWT + Refresh'}
            </span>
          </div>
          <div className="pt-2">
            <Button type="submit" label="Save Profile" variant="primary" isLoading={saving} />
          </div>
        </form>
      </Card>

      <Card padding={5}>
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-primary">Appearance & Session</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-primary">Dark Mode</div>
              <div className="text-xs text-secondary">
                Toggle Astryx dark theme surface palette across portal and console.
              </div>
            </div>
            <Switch
              label="Dark Mode"
              isLabelHidden
              value={mode === 'dark'}
              onChange={(checked) => setMode(checked ? 'dark' : 'light')}
            />
          </div>

          <Divider />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-primary">Rotate Session Token</div>
              <div className="text-xs text-secondary">
                Verify refresh token rotation against PostgreSQL without leaving the page.
              </div>
            </div>
            <Button
              label="Refresh Token"
              variant="secondary"
              size="sm"
              onClick={() => void handleRefreshToken()}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
