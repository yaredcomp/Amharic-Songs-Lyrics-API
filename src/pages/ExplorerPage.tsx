import React, { useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  CodeBlock,
  Divider,
  Selector,
  Tab,
  TabList,
  Table,
  TextInput,
} from '@astryxdesign/core';
import { Play } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

interface EndpointPreset {
  id: string;
  method: 'GET' | 'POST';
  label: string;
  path: string;
  authType: 'apiKey' | 'bearer' | 'none';
  hasPathParam?: 'id' | 'name';
  supportsQuery?: boolean;
}

const PRESETS: EndpointPreset[] = [
  {
    id: 'list-lyrics',
    method: 'GET',
    label: 'GET /api/v1/lyrics — Search & filter',
    path: '/api/v1/lyrics',
    authType: 'apiKey',
    supportsQuery: true,
  },
  {
    id: 'popular-lyrics',
    method: 'GET',
    label: 'GET /api/v1/lyrics/popular — Top tracks',
    path: '/api/v1/lyrics/popular',
    authType: 'apiKey',
  },
  {
    id: 'recent-lyrics',
    method: 'GET',
    label: 'GET /api/v1/lyrics/recent — Latest tracks',
    path: '/api/v1/lyrics/recent',
    authType: 'apiKey',
  },
  {
    id: 'lyric-by-id',
    method: 'GET',
    label: 'GET /api/v1/lyrics/:id — Track by UUID',
    path: '/api/v1/lyrics/:id',
    authType: 'apiKey',
    hasPathParam: 'id',
  },
  {
    id: 'list-artists',
    method: 'GET',
    label: 'GET /api/v1/artists — Artist directory',
    path: '/api/v1/artists',
    authType: 'apiKey',
  },
  {
    id: 'artist-by-name',
    method: 'GET',
    label: 'GET /api/v1/artists/:name — Artist tracks',
    path: '/api/v1/artists/:name',
    authType: 'apiKey',
    hasPathParam: 'name',
  },
  {
    id: 'health-ready',
    method: 'GET',
    label: 'GET /health/ready — DB readiness probe',
    path: '/health/ready',
    authType: 'none',
  },
  {
    id: 'auth-me',
    method: 'GET',
    label: 'GET /api/v1/auth/me — Current session profile',
    path: '/api/v1/auth/me',
    authType: 'bearer',
  },
  {
    id: 'admin-stats',
    method: 'GET',
    label: 'GET /api/v1/admin/stats — Admin telemetry',
    path: '/api/v1/admin/stats',
    authType: 'bearer',
  },
];

export function ExplorerPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user, sessionApiKey, setSessionApiKey, authFetch } = useAuth();
  const [selectedId, setSelectedId] = useState('list-lyrics');
  const [apiKeyInput, setApiKeyInput] = useState(sessionApiKey);
  const [pathParam, setPathParam] = useState('Teddy Afro');
  const [search, setSearch] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [sortBy, setSortBy] = useState('views');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState('1');
  const [limit, setLimit] = useState('5');

  const [isExecuting, setIsExecuting] = useState(false);
  const [respTab, setRespTab] = useState('body');
  const [responseState, setResponseState] = useState<{
    status: number;
    statusText: string;
    latencyMs: number;
    headers: { name: string; value: string }[];
    body: string;
  } | null>(null);

  const activePreset = useMemo(
    () => PRESETS.find((p) => p.id === selectedId) ?? PRESETS[0],
    [selectedId]
  );

  const builtUrl = useMemo(() => {
    let url = activePreset.path;
    if (activePreset.hasPathParam === 'id') {
      url = url.replace(':id', encodeURIComponent(pathParam.trim() || '00000000-0000-0000-0000-000000000000'));
    } else if (activePreset.hasPathParam === 'name') {
      url = url.replace(':name', encodeURIComponent(pathParam.trim() || 'Teddy Afro'));
    }

    if (activePreset.supportsQuery) {
      const qs = new URLSearchParams();
      if (page) qs.set('page', page);
      if (limit) qs.set('limit', limit);
      if (search.trim()) qs.set('search', search.trim());
      if (artist.trim()) qs.set('artist', artist.trim());
      if (genre.trim()) qs.set('genre', genre.trim());
      if (sortBy) qs.set('sortBy', sortBy);
      if (order) qs.set('order', order);
      const str = qs.toString();
      if (str) url += `?${str}`;
    }
    return url;
  }, [activePreset, pathParam, page, limit, search, artist, genre, sortBy, order]);

  const curlCommand = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const headers: string[] = [];
    if (activePreset.authType === 'apiKey') {
      headers.push(`-H "x-api-key: ${apiKeyInput.trim() || 'amlp_live_YOUR_API_KEY'}"`);
    } else if (activePreset.authType === 'bearer') {
      headers.push(`-H "Authorization: Bearer YOUR_JWT_OR_FIREBASE_TOKEN"`);
    }
    return `curl -X ${activePreset.method} "${origin}${builtUrl}"${
      headers.length ? ' \\\n  ' + headers.join(' \\\n  ') : ''
    }`;
  }, [activePreset, apiKeyInput, builtUrl]);

  const executeRequest = async () => {
    setIsExecuting(true);
    const started = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (activePreset.authType === 'apiKey' && apiKeyInput.trim()) {
        headers['x-api-key'] = apiKeyInput.trim();
        setSessionApiKey(apiKeyInput.trim());
      }

      const res =
        activePreset.authType === 'bearer'
          ? await authFetch(builtUrl, { method: activePreset.method })
          : await fetch(builtUrl, { method: activePreset.method, headers });

      const latencyMs = Math.round(performance.now() - started);
      const headerRows: { name: string; value: string }[] = [];
      res.headers.forEach((value, name) => {
        headerRows.push({ name, value });
      });

      const text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave plain text
      }

      setResponseState({
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        headers: headerRows,
        body: formatted,
      });
    } catch (err) {
      setResponseState({
        status: 0,
        statusText: 'Network Error',
        latencyMs: Math.round(performance.now() - started),
        headers: [],
        body: JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-primary">API Explorer</h1>
          <p className="text-sm text-secondary">
            Execute live HTTP requests against the Amharic Lyrics REST API and inspect headers,
            status codes, and JSON payloads.
          </p>
        </div>
        {!apiKeyInput && (
          <Button
            label={user ? 'Create an API Key' : 'Sign in for an API Key'}
            variant="secondary"
            size="sm"
            onClick={() => navigate(user ? '/api-keys' : '/register')}
          />
        )}
      </div>

      {activePreset.authType === 'apiKey' && !apiKeyInput.trim() && (
        <Banner
          status="info"
          title="API Key Required for Public Endpoints"
          description="Generate an amlp_live_ key in your Console -> API Keys tab (or paste an existing key below) to authorize /api/v1/lyrics and /api/v1/artists calls."
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Request Builder */}
        <Card className="lg:col-span-5" padding={5}>
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-primary">Request Builder</h2>

            <Selector
              label="Endpoint"
              width="100%"
              value={selectedId}
              onChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedId(val);
                  if (val === 'artist-by-name') setPathParam('Teddy Afro');
                  if (val === 'lyric-by-id') setPathParam('');
                }
              }}
              options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />

            {activePreset.authType === 'apiKey' && (
              <TextInput
                label="x-api-key Header"
                placeholder="amlp_live_..."
                value={apiKeyInput}
                onChange={setApiKeyInput}
                width="100%"
                hasClear
              />
            )}

            {activePreset.hasPathParam && (
              <TextInput
                label={activePreset.hasPathParam === 'id' ? 'Track UUID (:id)' : 'Artist Name (:name)'}
                placeholder={
                  activePreset.hasPathParam === 'id'
                    ? 'Paste a track UUID from /api/v1/lyrics'
                    : 'Teddy Afro'
                }
                value={pathParam}
                onChange={setPathParam}
                width="100%"
              />
            )}

            {activePreset.supportsQuery && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="text-xs font-medium text-secondary">Query Parameters</div>
                <TextInput
                  label="search"
                  placeholder="Tizita, ፍቅር, Ethiopia..."
                  value={search}
                  onChange={setSearch}
                  width="100%"
                  hasClear
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="artist"
                    placeholder="Mahmoud Ahmed"
                    value={artist}
                    onChange={setArtist}
                    width="100%"
                    hasClear
                  />
                  <TextInput
                    label="genre"
                    placeholder="Ethio-Jazz"
                    value={genre}
                    onChange={setGenre}
                    width="100%"
                    hasClear
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Selector
                    label="sortBy"
                    width="100%"
                    value={sortBy}
                    onChange={(v) => typeof v === 'string' && setSortBy(v)}
                    options={[
                      { value: 'views', label: 'views' },
                      { value: 'createdAt', label: 'createdAt' },
                      { value: 'title', label: 'title' },
                      { value: 'releaseYear', label: 'releaseYear' },
                    ]}
                  />
                  <Selector
                    label="order"
                    width="100%"
                    value={order}
                    onChange={(v) => typeof v === 'string' && setOrder(v)}
                    options={[
                      { value: 'desc', label: 'desc' },
                      { value: 'asc', label: 'asc' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="page" value={page} onChange={setPage} width="100%" />
                  <TextInput label="limit" value={limit} onChange={setLimit} width="100%" />
                </div>
              </div>
            )}

            <Divider />

            <div className="space-y-3">
              <div className="text-xs font-mono text-secondary break-all bg-surface border border-border rounded-lg p-2.5">
                <span className="font-semibold text-accent mr-2">{activePreset.method}</span>
                {builtUrl}
              </div>
              <Button
                label={isExecuting ? 'Sending Request...' : 'Execute Request'}
                variant="primary"
                size="lg"
                width="100%"
                isLoading={isExecuting}
                icon={<Play className="w-4 h-4" />}
                onClick={executeRequest}
              />
            </div>
          </div>
        </Card>

        {/* Response Inspector */}
        <Card className="lg:col-span-7" padding={5}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
              <TabList value={respTab} onChange={setRespTab} size="sm">
                <Tab value="body" label="Response Body" />
                <Tab value="headers" label="Headers" />
                <Tab value="curl" label="cURL" />
              </TabList>

              {responseState && (
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                  <span
                    className={`font-semibold ${
                      responseState.status >= 200 && responseState.status < 300
                        ? 'text-status-success'
                        : responseState.status >= 400
                          ? 'text-status-error'
                          : 'text-status-warning'
                    }`}
                  >
                    HTTP {responseState.status} {responseState.statusText}
                  </span>
                  <span aria-hidden="true" className="text-secondary">
                    ·
                  </span>
                  <span className="text-secondary">{responseState.latencyMs} ms</span>
                </div>
              )}
            </div>

            {respTab === 'curl' ? (
              <CodeBlock code={curlCommand} language="bash" hasCopyButton width="100%" />
            ) : !responseState ? (
              <div className="py-16 text-center space-y-2">
                <div className="text-sm font-medium text-primary">Ready to inspect response</div>
                <p className="text-xs text-secondary">
                  Configure your parameters and click Execute Request to inspect live server output.
                </p>
              </div>
            ) : respTab === 'body' ? (
              <CodeBlock
                code={responseState.body}
                language="json"
                hasCopyButton
                hasLineNumbers
                maxHeight={520}
                width="100%"
              />
            ) : (
              <Table
                data={responseState.headers}
                density="compact"
                dividers="rows"
                columns={[
                  {
                    key: 'name',
                    header: 'Header',
                    renderCell: (row) => <span className="font-mono text-xs">{row.name}</span>,
                  },
                  {
                    key: 'value',
                    header: 'Value',
                    renderCell: (row) => (
                      <span className="font-mono text-xs text-secondary break-all">{row.value}</span>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
