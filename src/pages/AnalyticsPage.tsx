import React, { useEffect, useState } from 'react';
import { Banner, Button, Card, EmptyState, Skeleton, Table } from '@astryxdesign/core';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

interface AnalyticsPayload {
  summary: {
    totalCalls: number;
    avgLatencyMs: number;
    successCalls: number;
    errorCalls: number;
  };
  byEndpoint: {
    endpoint: string;
    method: string;
    calls: number;
    avgLatencyMs: number;
  }[];
  recentLogs: {
    id: string;
    method: string;
    endpoint: string;
    statusCode: number;
    latencyMs: number;
    createdAt: string;
  }[];
}

export function AnalyticsPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    authFetch('/api/v1/developer/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [user, authFetch]);

  if (!user) {
    return (
      <div className="space-y-4">
        <Banner
          status="info"
          title="Sign in to view analytics"
          description="Authenticate to inspect live API request volume, endpoint latency, and status distributions."
        />
        <Button label="Sign In" variant="primary" onClick={() => navigate('/login')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">API Usage Analytics</h1>
          <p className="text-sm text-secondary mt-1">
            Real-time telemetry recorded from authenticated <code className="text-xs bg-muted px-1 rounded">x-api-key</code> requests.
          </p>
        </div>
        <Button
          label="Generate Traffic in Explorer"
          variant="secondary"
          size="sm"
          onClick={() => navigate('/explorer')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">Total API Calls</div>
          <div className="text-2xl font-bold text-primary mt-1 tabular-nums">
            {loading ? <Skeleton width={56} height={28} /> : (data?.summary.totalCalls ?? 0).toLocaleString()}
          </div>
        </Card>
        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">Average Latency</div>
          <div className="text-2xl font-bold text-primary mt-1 tabular-nums">
            {loading ? <Skeleton width={56} height={28} /> : `${data?.summary.avgLatencyMs ?? 0} ms`}
          </div>
        </Card>
        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">2xx / 3xx Responses</div>
          <div className="text-2xl font-bold text-status-success mt-1 tabular-nums">
            {loading ? <Skeleton width={56} height={28} /> : (data?.summary.successCalls ?? 0).toLocaleString()}
          </div>
        </Card>
        <Card padding={4}>
          <div className="text-xs font-medium text-secondary">4xx / 5xx Responses</div>
          <div className="text-2xl font-bold text-status-error mt-1 tabular-nums">
            {loading ? <Skeleton width={56} height={28} /> : (data?.summary.errorCalls ?? 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {!loading && (!data || data.summary.totalCalls === 0) ? (
        <Card padding={5}>
          <EmptyState
            icon={<BarChart3 className="w-8 h-8" />}
            title="No API requests recorded yet"
            description="Create an API key and run a query in the API Explorer to populate real endpoint telemetry."
            actions={
              <Button
                label="Open API Explorer"
                variant="primary"
                onClick={() => navigate('/explorer')}
              />
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding={5}>
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-primary">Calls by Endpoint</h2>
              <Table
                data={data?.byEndpoint ?? []}
                density="compact"
                dividers="rows"
                columns={[
                  {
                    key: 'method',
                    header: 'Method',
                    renderCell: (r) => <span className="font-mono text-xs text-accent">{r.method}</span>,
                  },
                  {
                    key: 'endpoint',
                    header: 'Endpoint',
                    renderCell: (r) => <span className="font-mono text-xs">{r.endpoint}</span>,
                  },
                  {
                    key: 'calls',
                    header: 'Calls',
                    renderCell: (r) => <span className="font-mono text-xs tabular-nums">{r.calls}</span>,
                  },
                  {
                    key: 'avgLatencyMs',
                    header: 'Avg Latency',
                    renderCell: (r) => (
                      <span className="font-mono text-xs tabular-nums">{r.avgLatencyMs} ms</span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>

          <Card padding={5}>
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-primary">Recent Request Log</h2>
              <Table
                data={data?.recentLogs ?? []}
                density="compact"
                dividers="rows"
                columns={[
                  {
                    key: 'endpoint',
                    header: 'Endpoint',
                    renderCell: (r) => <span className="font-mono text-xs">{r.endpoint}</span>,
                  },
                  {
                    key: 'statusCode',
                    header: 'Status',
                    renderCell: (r) => (
                      <span
                        className={`font-mono text-xs tabular-nums font-medium ${
                          r.statusCode < 400 ? 'text-status-success' : 'text-status-error'
                        }`}
                      >
                        {r.statusCode}
                      </span>
                    ),
                  },
                  {
                    key: 'latencyMs',
                    header: 'Latency',
                    renderCell: (r) => (
                      <span className="font-mono text-xs tabular-nums">{r.latencyMs} ms</span>
                    ),
                  },
                  {
                    key: 'createdAt',
                    header: 'Timestamp',
                    renderCell: (r) => (
                      <span className="text-xs text-secondary tabular-nums">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
