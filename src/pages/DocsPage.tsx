import React, { useState } from 'react';
import { Button, Card, CodeBlock, Divider, Tab, TabList, Table } from '@astryxdesign/core';
import { ExternalLink, FileCode2, Terminal } from 'lucide-react';
import { PortalRoute } from '../lib/routes.ts';

const ENDPOINT_ROWS = [
  { method: 'GET', path: '/api/v1/lyrics', auth: 'x-api-key', summary: 'Paginated search, filter & sort' },
  { method: 'GET', path: '/api/v1/lyrics/:id', auth: 'x-api-key', summary: 'Retrieve full lyrics by UUID' },
  { method: 'GET', path: '/api/v1/lyrics/popular', auth: 'x-api-key', summary: 'Top 10 tracks by view count' },
  { method: 'GET', path: '/api/v1/lyrics/recent', auth: 'x-api-key', summary: '10 most recently added tracks' },
  { method: 'GET', path: '/api/v1/artists', auth: 'x-api-key', summary: 'List artists with track counts' },
  { method: 'GET', path: '/api/v1/artists/:name', auth: 'x-api-key', summary: 'Artist profile & tracks' },
  { method: 'POST', path: '/api/v1/auth/register', auth: 'Public', summary: 'Create developer account' },
  { method: 'POST', path: '/api/v1/auth/login', auth: 'Public', summary: 'Issue JWT access & refresh pair' },
  { method: 'GET', path: '/api/v1/auth/google/config', auth: 'Public', summary: 'Google OAuth client configuration' },
  { method: 'POST', path: '/api/v1/auth/google', auth: 'Google ID token', summary: 'Exchange Google credentials for JWTs' },
  { method: 'POST', path: '/api/v1/auth/refresh', auth: 'Refresh Token', summary: 'Rotate JWT refresh token' },
  { method: 'GET', path: '/api/v1/auth/me', auth: 'Bearer JWT', summary: 'Current user profile' },
  { method: 'POST', path: '/api/v1/admin/lyrics', auth: 'Admin Bearer', summary: 'Create lyrics (Idempotency-Key)' },
  { method: 'PATCH', path: '/api/v1/admin/lyrics/:id', auth: 'Admin Bearer', summary: 'Partial update lyrics' },
  { method: 'DELETE', path: '/api/v1/admin/lyrics/:id', auth: 'Admin Bearer', summary: 'Soft-delete lyrics record' },
  { method: 'GET', path: '/api/v1/admin/stats', auth: 'Admin Bearer', summary: 'Catalog & API key telemetry' },
];

const STATUS_ROWS = [
  { code: '200 / 201 / 204', meaning: 'Request succeeded, resource created, or deleted with no body' },
  { code: '400 / 422', meaning: 'Malformed JSON, invalid header, or Zod schema validation error' },
  { code: '401 / 403', meaning: 'Missing/invalid x-api-key, disabled key, or insufficient ADMIN role' },
  { code: '404 / 405', meaning: 'Resource not found or HTTP method not supported on route' },
  { code: '409 / 415', meaning: 'Idempotency payload conflict or non-JSON Content-Type header' },
  { code: '429', meaning: 'API key daily quota exceeded or IP rate-limit triggered' },
  { code: '500 / 503', meaning: 'Unexpected server error or database readiness probe failure' },
];

export function DocsPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const [section, setSection] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium text-accent">API Documentation · v1.0.0</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
            Developer Documentation
          </h1>
          <p className="text-sm sm:text-base text-secondary">
            Authentication headers, REST endpoints, response envelopes, idempotency semantics, and
            live OpenAPI 3.1 Swagger UI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            label="Open API Explorer"
            variant="primary"
            size="md"
            icon={<Terminal className="w-4 h-4" />}
            onClick={() => navigate('/explorer')}
          />
          <Button
            label="Download OpenAPI YAML"
            variant="secondary"
            size="md"
            icon={<FileCode2 className="w-4 h-4" />}
            href="/api/openapi.yaml"
            target="_blank"
            rel="noopener noreferrer"
          />
          <Button
            label="Postman Collection"
            variant="ghost"
            size="md"
            href="/api/postman-collection.json"
            target="_blank"
            rel="noopener noreferrer"
          />
        </div>
      </div>

      <TabList value={section} onChange={setSection} hasDivider>
        <Tab value="overview" label="Quickstart & Auth" />
        <Tab value="endpoints" label="Endpoint Reference" />
        <Tab value="swagger" label="Swagger UI" />
      </TabList>

      {section === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding={5}>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary">1. Public API Key Authentication</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Every request to <code className="text-xs bg-muted px-1 rounded">/api/v1/lyrics*</code>{' '}
                and <code className="text-xs bg-muted px-1 rounded">/api/v1/artists*</code> requires
                an active <code className="text-xs bg-muted px-1 rounded">x-api-key</code> header.
                Responses include <code className="text-xs bg-muted px-1 rounded">X-RateLimit-Limit</code>{' '}
                and <code className="text-xs bg-muted px-1 rounded">X-RateLimit-Remaining</code>{' '}
                headers.
              </p>
              <CodeBlock
                language="bash"
                hasCopyButton
                width="100%"
                code={`curl -H "x-api-key: amlp_live_YOUR_KEY" \\
  "https://your-host/api/v1/lyrics?genre=Tizita&page=1&limit=10"`}
              />
            </div>
          </Card>

          <Card padding={5}>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary">2. Idempotent Mutations & Envelopes</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Mutating requests (<code className="text-xs bg-muted px-1 rounded">POST</code>,{' '}
                <code className="text-xs bg-muted px-1 rounded">PUT</code>,{' '}
                <code className="text-xs bg-muted px-1 rounded">PATCH</code>,{' '}
                <code className="text-xs bg-muted px-1 rounded">DELETE</code>) support an{' '}
                <code className="text-xs bg-muted px-1 rounded">Idempotency-Key</code> header to
                safely replay identical requests and return <code className="text-xs bg-muted px-1 rounded">409</code>{' '}
                on mismatched payloads.
              </p>
              <CodeBlock
                language="json"
                hasCopyButton
                width="100%"
                code={`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "limit", "location": "query", "message": "Number must be <= 100" }]
  }
}`}
              />
            </div>
          </Card>

          <Card className="lg:col-span-2" padding={5}>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary">HTTP Status Code Matrix</h2>
              <Table
                data={STATUS_ROWS}
                density="compact"
                dividers="rows"
                columns={[
                  {
                    key: 'code',
                    header: 'Status Code',
                    renderCell: (row) => (
                      <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                        {row.code}
                      </span>
                    ),
                  },
                  {
                    key: 'meaning',
                    header: 'Behavior & Resolution',
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}

      {section === 'endpoints' && (
        <Card padding={5}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">REST API v1 Endpoints</h2>
              <Button
                label="Test in Playground"
                variant="secondary"
                size="sm"
                onClick={() => navigate('/explorer')}
              />
            </div>
            <Divider />
            <Table
              data={ENDPOINT_ROWS}
              density="compact"
              hasHover
              columns={[
                {
                  key: 'method',
                  header: 'Method',
                  renderCell: (row) => (
                    <span className="font-mono text-xs font-semibold text-accent">{row.method}</span>
                  ),
                },
                {
                  key: 'path',
                  header: 'Path',
                  renderCell: (row) => (
                    <span className="font-mono text-xs text-primary">{row.path}</span>
                  ),
                },
                { key: 'auth', header: 'Auth Requirement' },
                { key: 'summary', header: 'Description' },
              ]}
            />
          </div>
        </Card>
      )}

      {section === 'swagger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary">
              Interactive OpenAPI 3.1 Swagger UI served directly from{' '}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/docs</code>.
            </p>
            <Button
              label="Open Standalone Swagger"
              variant="secondary"
              size="sm"
              endContent={<ExternalLink className="w-3.5 h-3.5" />}
              href="/api/docs/"
              target="_blank"
              rel="noopener noreferrer"
            />
          </div>
          <div className="border border-border rounded-xl overflow-hidden bg-white h-[720px]">
            <iframe
              src="/api/docs/"
              title="Amharic Lyrics API Swagger UI"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
