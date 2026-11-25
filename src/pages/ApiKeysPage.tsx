import React, { useCallback, useEffect, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Dialog,
  DialogHeader,
  EmptyState,
  Layout,
  LayoutContent,
  LayoutFooter,
  ProgressBar,
  Switch,
  Table,
  TextInput,
  useToast,
} from '@astryxdesign/core';
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

type ApiKeyItem = {
  id: string;
  keyPrefix: string;
  name: string;
  isActive: boolean;
  requestsUsed: number;
  dailyQuota: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeysPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user, authFetch, setSessionApiKey } = useAuth();
  const toast = useToast();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyQuota, setNewKeyQuota] = useState('1000');
  const [submitting, setSubmitting] = useState(false);

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/developer/api-keys');
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  if (!user) {
    return (
      <div className="space-y-4">
        <Banner
          status="info"
          title="Authentication Required"
          description="Sign in to create and manage your API keys."
        />
        <Button label="Sign In" variant="primary" onClick={() => navigate('/login')} />
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/v1/developer/api-keys', {
        method: 'POST',
        headers: {
          'Idempotency-Key': `create-key-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          dailyQuota: Number(newKeyQuota) || 1000,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create key');

      setCreateOpen(false);
      setNewKeyName('');
      setRevealedKey(json.data.rawKey);
      setSessionApiKey(json.data.rawKey);
      toast({ body: 'API key generated', type: 'info' });
      await loadKeys();
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Failed to create key', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: ApiKeyItem, nextActive: boolean) => {
    const res = await authFetch(`/api/v1/developer/api-keys/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: nextActive }),
    });
    if (res.ok) {
      toast({ body: nextActive ? 'API key enabled' : 'API key disabled', type: 'info' });
      await loadKeys();
    } else {
      toast({ body: 'Failed to update API key', type: 'error' });
    }
  };

  const handleRegenerate = async (id: string) => {
    const res = await authFetch(`/api/v1/developer/api-keys/${id}/regenerate`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': `regen-${id}-${Date.now()}`,
      },
    });
    const json = await res.json();
    if (res.ok) {
      setRevealedKey(json.data.rawKey);
      setSessionApiKey(json.data.rawKey);
      toast({ body: 'API key rotated', type: 'info' });
      await loadKeys();
    } else {
      toast({ body: json?.error?.message || 'Regeneration failed', type: 'error' });
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevokeId) return;
    const res = await authFetch(`/api/v1/developer/api-keys/${confirmRevokeId}`, {
      method: 'DELETE',
    });
    setConfirmRevokeId(null);
    if (res.ok) {
      toast({ body: 'API key permanently revoked', type: 'info' });
      await loadKeys();
    } else {
      toast({ body: 'Failed to revoke key', type: 'error' });
    }
  };

  const copyRawKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    toast({ body: 'Copied API key to clipboard', type: 'info' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">API Keys</h1>
          <p className="text-sm text-secondary mt-1">
            Raw <code className="text-xs bg-muted px-1 rounded">amlp_live_</code> secrets are
            displayed once on creation and persisted strictly as SHA-256 hashes.
          </p>
        </div>
        <Button
          label="Create API Key"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        />
      </div>

      <Card padding={4}>
        {!loading && keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="w-8 h-8" />}
            title="No API keys yet"
            description="Generate your first x-api-key credential to start querying /api/v1/lyrics and /api/v1/artists."
            actions={
              <Button
                label="Create First API Key"
                variant="primary"
                onClick={() => setCreateOpen(true)}
              />
            }
          />
        ) : (
          <Table<ApiKeyItem>
            data={keys}
            density="balanced"
            hasHover
            columns={[
              {
                key: 'name',
                header: 'Name',
                renderCell: (row) => <span className="font-medium text-primary">{row.name}</span>,
              },
              {
                key: 'keyPrefix',
                header: 'Key Prefix',
                renderCell: (row) => (
                  <span className="font-mono text-xs text-secondary">{row.keyPrefix}...</span>
                ),
              },
              {
                key: 'requestsUsed',
                header: 'Quota Usage',
                renderCell: (row) => (
                  <div className="space-y-1 min-w-[140px]">
                    <div className="text-xs font-mono tabular-nums text-secondary">
                      {row.requestsUsed.toLocaleString()} / {row.dailyQuota.toLocaleString()}
                    </div>
                    <ProgressBar
                      label={`Daily quota usage for ${row.name}`}
                      isLabelHidden
                      value={row.requestsUsed}
                      max={Math.max(1, row.dailyQuota)}
                    />
                  </div>
                ),
              },
              {
                key: 'isActive',
                header: 'Status',
                renderCell: (row) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      label={`Toggle ${row.name}`}
                      isLabelHidden
                      value={row.isActive}
                      onChange={(checked) => void handleToggleActive(row, checked)}
                    />
                    <span
                      className={`text-xs font-medium ${
                        row.isActive ? 'text-status-success' : 'text-secondary'
                      }`}
                    >
                      {row.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                renderCell: (row) => (
                  <div className="flex items-center gap-1">
                    <Button
                      label="Regenerate"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      tooltip="Rotate secret"
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      onClick={() => void handleRegenerate(row.id)}
                    />
                    <Button
                      label="Revoke"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      tooltip="Revoke key"
                      icon={<Trash2 className="w-3.5 h-3.5 text-status-error" />}
                      onClick={() => setConfirmRevokeId(row.id)}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Create Key Dialog */}
      <Dialog isOpen={createOpen} onOpenChange={setCreateOpen} purpose="form" width={440}>
        <Layout
          header={<DialogHeader title="Create API Key" onOpenChange={setCreateOpen} />}
          content={
            <LayoutContent>
              <form id="create-key-form" onSubmit={handleCreate} className="space-y-4 py-2">
                <TextInput
                  label="Key Name"
                  placeholder="e.g. iOS Karaoke Production"
                  value={newKeyName}
                  onChange={setNewKeyName}
                  isRequired
                  width="100%"
                />
                <TextInput
                  label="Daily Request Quota"
                  value={newKeyQuota}
                  onChange={setNewKeyQuota}
                  description="Between 10 and 10,000 requests/day on developer plans."
                  width="100%"
                />
              </form>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div className="flex justify-end gap-2 w-full">
                <Button label="Cancel" variant="ghost" onClick={() => setCreateOpen(false)} />
                <Button
                  type="submit"
                  form="create-key-form"
                  label="Generate Key"
                  variant="primary"
                  isLoading={submitting}
                />
              </div>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* One-Time Key Reveal Dialog */}
      <Dialog
        isOpen={Boolean(revealedKey)}
        onOpenChange={(open) => {
          if (!open) setRevealedKey(null);
        }}
        purpose="form"
        width={500}
      >
        <Layout
          header={
            <DialogHeader
              title="Save Your API Key"
              onOpenChange={(open) => {
                if (!open) setRevealedKey(null);
              }}
            />
          }
          content={
            <LayoutContent>
              <div className="space-y-4 py-2">
                <Banner
                  status="warning"
                  title="Displayed Once"
                  description="Copy this key now. For security, we store only a SHA-256 hash and cannot recover the full key after you close this dialog."
                />
                <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3">
                  <code className="text-xs font-mono text-primary break-all flex-1">
                    {revealedKey}
                  </code>
                  <Button
                    label="Copy"
                    variant="secondary"
                    size="sm"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() => void copyRawKey()}
                  />
                </div>
              </div>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div className="flex justify-between w-full gap-2">
                <Button
                  label="Test in API Explorer"
                  variant="secondary"
                  onClick={() => {
                    setRevealedKey(null);
                    navigate('/explorer');
                  }}
                />
                <Button label="Done" variant="primary" onClick={() => setRevealedKey(null)} />
              </div>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* Confirm Revoke Dialog */}
      <Dialog
        isOpen={Boolean(confirmRevokeId)}
        onOpenChange={(open) => {
          if (!open) setConfirmRevokeId(null);
        }}
        width={420}
      >
        <Layout
          header={
            <DialogHeader
              title="Revoke API Key"
              onOpenChange={(open) => {
                if (!open) setConfirmRevokeId(null);
              }}
            />
          }
          content={
            <LayoutContent>
              <p className="text-sm text-secondary py-2">
                Any applications using this API key will immediately receive HTTP 401 responses.
                This action cannot be undone.
              </p>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div className="flex justify-end gap-2 w-full">
                <Button label="Cancel" variant="ghost" onClick={() => setConfirmRevokeId(null)} />
                <Button
                  label="Revoke Permanently"
                  variant="destructive"
                  onClick={() => void handleRevoke()}
                />
              </div>
            </LayoutFooter>
          }
        />
      </Dialog>
    </div>
  );
}
