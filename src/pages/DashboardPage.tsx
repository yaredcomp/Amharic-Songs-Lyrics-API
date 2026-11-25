import React, { useEffect, useState } from 'react';
import { Banner, Button, Card, Divider, Skeleton, Table } from '@astryxdesign/core';
import { ArrowRight, KeyRound, ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  requestsUsed: number;
  dailyQuota: number;
}

type PreviewTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  views: number;
};

export function DashboardPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [preview, setPreview] = useState<PreviewTrack[]>([]);
  const [artistsCount, setArtistsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingData(true);
      try {
        const previewRes = await fetch('/api/v1/portal/preview');
        if (previewRes.ok && active) {
          const pJson = await previewRes.json();
          setPreview(pJson.data?.featured || []);
          setArtistsCount(pJson.data?.artistsCount || 0);
        }

        if (user) {
          const keysRes = await authFetch('/api/v1/developer/api-keys');
          if (keysRes.ok && active) {
            const kJson = await keysRes.json();
            setKeys(kJson.data || []);
          }
        }
      } finally {
        if (active) setLoadingData(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [user, authFetch]);

  if (!authLoading && !user) {
    return (
      <div className="space-y-6">
        <Banner
          status="info"
          title="Sign in to access your Developer Console"
          description="Authenticate with Google or email/password to create API keys and inspect request analytics. Administration tools are available to administrator accounts."
        />
        <div className="flex gap-3">
          <Button label="Sign In" variant="primary" onClick={() => navigate('/login')} />
          <Button label="Register" variant="secondary" onClick={() => navigate('/register')} />
        </div>
      </div>
    );
  }

  const activeKeysCount = keys.filter((k) => k.isActive).length;
  const totalUsedToday = keys.reduce((acc, k) => acc + k.requestsUsed, 0);
  const totalQuota = keys.reduce((acc, k) => acc + k.dailyQuota, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Welcome, {user?.name || 'Developer'}
          </h1>
          <p className="text-sm text-secondary mt-1">
            Account role: <span className="font-medium text-primary">{user?.role}</span> · Manage
            keys, monitor quota usage, and test Amharic lyrics queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label="Manage API Keys"
            variant="primary"
            size="md"
            icon={<KeyRound className="w-4 h-4" />}
            onClick={() => navigate('/api-keys')}
          />
          {user?.role === 'ADMIN' && (
            <Button
              label="Admin Catalog"
              variant="secondary"
              size="md"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => navigate('/admin/lyrics')}
            />
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">Active API Keys</div>
          <div className="text-2xl font-bold text-primary mt-1 tabular-nums">
            {loadingData ? <Skeleton width={48} height={28} /> : activeKeysCount}
          </div>
          <div className="text-xs text-secondary mt-1 tabular-nums">{keys.length} total keys</div>
        </Card>

        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">Requests Used</div>
          <div className="text-2xl font-bold text-primary mt-1 tabular-nums">
            {loadingData ? <Skeleton width={64} height={28} /> : totalUsedToday.toLocaleString()}
          </div>
          <div className="text-xs text-secondary mt-1 tabular-nums">
            of {totalQuota.toLocaleString()} daily quota
          </div>
        </Card>

        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">Indexed Artists</div>
          <div className="text-2xl font-bold text-primary mt-1 tabular-nums">
            {loadingData ? <Skeleton width={48} height={28} /> : artistsCount}
          </div>
          <div className="text-xs text-secondary mt-1">Ethiopic & Latin metadata</div>
        </Card>

        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">OpenAPI Spec</div>
          <div className="text-2xl font-bold text-primary mt-1">v3.1</div>
          <div className="text-xs text-secondary mt-1">Swagger UI live at /api/docs</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5" padding={5}>
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-primary">Developer Quickstart</h2>
            <Divider />
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-primary">1. Mint an API key</div>
                  <div className="text-xs text-secondary">
                    Generate an <code className="bg-muted px-1 rounded">amlp_live_</code> credential.
                  </div>
                </div>
                <Button label="Keys" size="sm" variant="secondary" onClick={() => navigate('/api-keys')} />
              </div>
              <Divider />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-primary">2. Test queries live</div>
                  <div className="text-xs text-secondary">
                    Send requests and inspect headers in the Explorer.
                  </div>
                </div>
                <Button
                  label="Explorer"
                  size="sm"
                  variant="secondary"
                  icon={<Terminal className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/explorer')}
                />
              </div>
              <Divider />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-primary">3. Inspect Swagger schema</div>
                  <div className="text-xs text-secondary">
                    Download OpenAPI YAML or Postman collection.
                  </div>
                </div>
                <Button
                  label="Docs"
                  size="sm"
                  variant="ghost"
                  endContent={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/docs')}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-7" padding={5}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary">Top Catalog Tracks</h2>
              <Button
                label="Query via API"
                size="sm"
                variant="ghost"
                onClick={() => navigate('/explorer')}
              />
            </div>
            <Table<PreviewTrack>
              data={preview}
              density="compact"
              dividers="rows"
              columns={[
                { key: 'title', header: 'Title' },
                { key: 'artist', header: 'Artist' },
                { key: 'genre', header: 'Genre' },
                {
                  key: 'views',
                  header: 'Views',
                  renderCell: (r) => (
                    <span className="font-mono text-xs tabular-nums">
                      {r.views.toLocaleString()}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
