import React from 'react';
import { Button, Card, Divider, Table } from '@astryxdesign/core';
import { Clock3 } from 'lucide-react';
import { PortalRoute } from '../lib/routes.ts';

const PLANS = [
  {
    name: 'Developer Sandbox',
    audience: 'For hobbyists & prototypes',
    price: 'ETB 0',
    cadence: 'per month',
    quota: '1,000 requests / day',
    features: [
      'Full Ethiopic & transliterated search',
      'Up to 3 active amlp_live_ keys',
      'OpenAPI 3.1 + interactive Explorer',
      'Standard rate-limit headers',
    ],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Production Studio',
    audience: 'For production music apps',
    price: 'ETB 400',
    cadence: 'per month',
    quota: '50,000 requests / day',
    features: [
      'High-throughput connection pooling',
      'Up to 25 scoped API keys',
      'Endpoint latency & usage telemetry',
      'Idempotency-Key replay guarantees',
    ],
    cta: 'Create Account',
    featured: true,
  },
  {
    name: 'Archive & Media',
    audience: 'For cultural archives & broadcasters',
    price: 'ETB 3,000',
    cadence: 'per month',
    quota: '500,000 requests / day',
    features: [
      'Dedicated quota overrides',
      'Admin catalog curation seats',
      'Immutable PostgreSQL audit log exports',
      '99.9% uptime SLA & priority support',
    ],
    cta: 'Open Console',
    featured: false,
  },
];

const COMPARISON = [
  { capability: 'Daily API Quota', free: '1,000 req/day', pro: '50,000 req/day', enterprise: '500,000 req/day' },
  { capability: 'Max Active API Keys', free: '3 keys', pro: '25 keys', enterprise: 'Unlimited' },
  { capability: 'Ge\'ez + Transliterated Search', free: 'Included', pro: 'Included', enterprise: 'Included' },
  { capability: 'Usage Analytics Retention', free: '7 days', pro: '90 days', enterprise: '365 days' },
  { capability: 'Idempotency Key Replay Window', free: '24 hours', pro: '24 hours', enterprise: '7 days' },
];

export function PricingPage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 space-y-16">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Transparent quotas for every stage
        </h1>
        <p className="text-base text-secondary">
          Start immediately with 1,000 free daily requests per API key and scale quotas cleanly in
          your developer console.
        </p>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-secondary"
      >
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <p>
          <span className="font-semibold text-primary">Payments are coming soon.</span> Paid plans
          are priced in Ethiopian birr (ETB), but checkout is not available yet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            padding={5}
            className={plan.featured ? 'ring-1 ring-accent-bg' : ''}
          >
            <div className="h-full flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-accent">{plan.audience}</div>
                  <h2 className="text-xl font-bold text-primary mt-1">{plan.name}</h2>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-primary tabular-nums">{plan.price}</span>
                  <span className="text-sm text-secondary">{plan.cadence}</span>
                </div>

                <div className="text-xs font-mono text-primary bg-muted px-3 py-2 rounded-lg tabular-nums">
                  {plan.quota}
                </div>

                <Divider />

                <ul className="space-y-2.5 text-sm text-secondary">
                  {plan.features.map((feat) => (
                    <li key={feat}>{feat}</li>
                  ))}
                </ul>
              </div>

              <Button
                label={plan.cta}
                variant={plan.featured ? 'primary' : 'secondary'}
                size="lg"
                width="100%"
                onClick={() => navigate('/register')}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card padding={5}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-primary">Quota & Capability Comparison</h2>
          <Table
            data={COMPARISON}
            density="balanced"
            dividers="rows"
            columns={[
              { key: 'capability', header: 'Capability' },
              {
                key: 'free',
                header: 'Developer Sandbox',
                renderCell: (r) => <span className="tabular-nums text-secondary">{r.free}</span>,
              },
              {
                key: 'pro',
                header: 'Production Studio',
                renderCell: (r) => <span className="tabular-nums text-primary font-medium">{r.pro}</span>,
              },
              {
                key: 'enterprise',
                header: 'Archive & Media',
                renderCell: (r) => <span className="tabular-nums text-secondary">{r.enterprise}</span>,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
