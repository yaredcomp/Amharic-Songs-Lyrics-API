import React, { useEffect, useState } from 'react';
import { Button, Card, CodeBlock, Divider, Tab, TabList } from '@astryxdesign/core';
import { ArrowRight, Code2, KeyRound, Music2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

interface PreviewTrack {
  id: string;
  title: string;
  titleTranslit: string;
  artist: string;
  album: string;
  genre: string;
  releaseYear: number | null;
  views: number;
  excerpt: string;
}

const SNIPPETS: Record<string, { lang: string; code: string }> = {
  curl: {
    lang: 'bash',
    code: `curl -X GET "https://api.zemalyrics.dev/api/v1/lyrics?search=Tizita&limit=1" \\
  -H "x-api-key: amlp_live_YOUR_API_KEY" \\
  -H "Accept: application/json"`,
  },
  typescript: {
    lang: 'typescript',
    code: `const response = await fetch(
  'https://api.zemalyrics.dev/api/v1/lyrics?artist=Mahmoud%20Ahmed',
  {
    headers: {
      'x-api-key': process.env.ZEMA_API_KEY!,
    },
  }
);

const { data, meta } = await response.json();`,
  },
  json: {
    lang: 'json',
    code: `{
  "success": true,
  "data": [
    {
      "id": "c7a8d02e-1a5f-4e92-9c31-91d72f54a310",
      "title": "ትዝታ (Tizita)",
      "titleTranslit": "Tizita",
      "artist": "Mahmoud Ahmed",
      "album": "Ere Mela Mela",
      "genre": "Tizita",
      "language": "am",
      "lyrics": "ትዝታዬ መጣ የድሮው ትዝታ\\nልቤን የሚነካው በሰላም በደስታ..."
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 12 }
}`,
  },
};

export function HomePage({ navigate }: { navigate: (route: PortalRoute) => void }) {
  const { user } = useAuth();
  const [snippetTab, setSnippetTab] = useState('curl');
  const [previewTracks, setPreviewTracks] = useState<PreviewTrack[]>([]);
  const [artistsCount, setArtistsCount] = useState<number>(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    fetch('/api/v1/portal/preview')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.featured) {
          setPreviewTracks(json.data.featured);
          setArtistsCount(json.data.artistsCount ?? 0);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="home-page space-y-24 pb-12">
      {/* Hero Split */}
      <section className="home-hero max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <div className="home-eyebrow">
                A living archive, made searchable
              </div>
              <h1 className="home-display text-primary">
                The sound of Ethiopia, <em>one API away.</em>
              </h1>
              <p className="text-base sm:text-lg text-secondary leading-relaxed max-w-lg">
                Explore the words, artists, and stories behind Ethiopian music. One thoughtful API
                for Ge'ez lyrics, transliterations, and the details that bring every track to life.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  label={user ? 'Open Console' : 'Get API Key'}
                  variant="primary"
                  size="lg"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onClick={() => navigate(user ? '/api-keys' : '/register')}
                />
                <Button
                  label="Browse the API"
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/explorer')}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-secondary pt-1">
                <span>Ge'ez + Latin search</span>
                <span aria-hidden="true">·</span>
                <span>OpenAPI 3.1</span>
                <span aria-hidden="true">·</span>
                <span>Built for makers</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <Card width="100%" padding={5} className="home-code-card flex flex-col justify-between w-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                  <TabList value={snippetTab} onChange={setSnippetTab} size="sm">
                    <Tab value="curl" label="cURL" />
                    <Tab value="typescript" label="TypeScript" />
                    <Tab value="json" label="JSON Response" />
                  </TabList>
                  <span className="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-secondary whitespace-nowrap shrink-0">
                    <span className="w-2 h-2 rounded-full bg-status-success" />
                    GET /api/v1/lyrics
                  </span>
                </div>
                <CodeBlock
                  code={SNIPPETS[snippetTab].code}
                  language={SNIPPETS[snippetTab].lang}
                  hasCopyButton
                  hasLineNumbers
                  width="100%"
                  container="section"
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Cultural Heritage Showcase + Live Catalog Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="home-artwork lg:col-span-5 relative overflow-hidden">
            {!imgFailed ? (
              <img
                src="/src/assets/images/studio_addis_vinyl_1795524453737.jpg"
                alt="Vintage Ethiopian jazz vinyl records, traditional krar, and analog studio console"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center">
                <Music2 className="w-12 h-12 text-slate-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-end p-6 text-white space-y-2">
              <div className="home-section-label text-amber-300">
                The archive
              </div>
              <h2 className="text-3xl font-semibold leading-snug">
                A new home for the songs that stay with us.
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed max-w-sm">
                {artistsCount > 0
                  ? `Explore music from ${artistsCount}+ Ethiopian artists, indexed in Ge'ez and Latin script.`
                  : 'Explore Ethiopian music in its original script and the language of search.'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="home-section-label">From the collection</div>
                <h2 className="text-2xl font-semibold text-primary mt-1">Songs worth discovering</h2>
                <p className="text-sm text-secondary mt-1">
                  A glimpse into the archive. Full lyrics are available through the API with an{' '}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">x-api-key</code>.
                </p>
              </div>
              <Button
                label="Try in Explorer"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/explorer')}
              />
            </div>

            <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
              {previewTracks.length === 0 ? (
                <div className="p-6 text-sm text-secondary">Loading catalog records...</div>
              ) : (
                previewTracks.map((track) => (
                  <div
                    key={track.id}
                    className="home-track-row p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-sm font-semibold text-primary truncate">
                        {track.title}
                      </div>
                      <div className="text-xs text-secondary flex flex-wrap items-center gap-2">
                        <span>{track.artist}</span>
                        <span aria-hidden="true">·</span>
                        <span>{track.album}</span>
                        <span aria-hidden="true">·</span>
                        <span>{track.genre}</span>
                        {track.releaseYear ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{track.releaseYear}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-secondary tabular-nums whitespace-nowrap shrink-0">
                      {track.views.toLocaleString()} views
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Asymmetric Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="max-w-2xl space-y-2">
          <div className="home-section-label">Made for your next idea</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-primary">
            Everything you need to bring the music into your product.
          </h2>
          <p className="text-sm sm:text-base text-secondary">
            A reliable foundation for building apps, archives, and experiences rooted in Ethiopian
            music.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2" padding={5}>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Code2 className="w-4 h-4 text-accent" />
                <span>01. Dual-Script Search, Pagination & Artist Aggregation</span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Search seamlessly across Ethiopic Ge'ez characters and Latin transliteration using
                <code className="mx-1 text-xs bg-muted px-1.5 py-0.5 rounded">?search=</code>,
                filter by artist or genre, sort by popularity or release year, and paginate with
                consistent <code className="mx-1 text-xs bg-muted px-1.5 py-0.5 rounded">meta</code>{' '}
                envelopes.
              </p>
              <Divider />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-secondary">
                <div>
                  <div className="font-mono text-primary font-medium">GET /api/v1/lyrics</div>
                  <div className="mt-0.5">Paginated catalog & search</div>
                </div>
                <div>
                  <div className="font-mono text-primary font-medium">GET /api/v1/artists</div>
                  <div className="mt-0.5">Discographies & genre index</div>
                </div>
                <div>
                  <div className="font-mono text-primary font-medium">GET /api/v1/lyrics/popular</div>
                  <div className="mt-0.5">Ranked by real API views</div>
                </div>
              </div>
            </div>
          </Card>

          <Card padding={5}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <KeyRound className="w-4 h-4 text-accent" />
                <span>02. Hashed API Keys</span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Keys use the <code className="text-xs bg-muted px-1 rounded">amlp_live_</code>{' '}
                prefix, reveal their secret once at minting, and persist strictly as SHA-256 hashes
                with per-key daily quotas.
              </p>
            </div>
          </Card>

          <Card padding={5}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>03. Idempotent Mutations & RBAC</span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Admin catalog writes and key updates honor{' '}
                <code className="text-xs bg-muted px-1 rounded">Idempotency-Key</code> request
                fingerprints, JWT refresh rotation, and immutable PostgreSQL audit logs.
              </p>
            </div>
          </Card>

          <Card className="md:col-span-2" padding={5}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-lg">
                <div className="text-sm font-semibold text-primary">
                  04. OpenAPI 3.1, Swagger UI & Postman Ready
                </div>
                <p className="text-sm text-secondary leading-relaxed">
                  Inspect live schemas at <code className="text-xs bg-muted px-1 rounded">/api/docs</code>,
                  test requests directly in the browser Playground, or import the Postman collection
                  into your workspace.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  label="Read Documentation"
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/docs')}
                />
                <Button
                  label="View Pricing"
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/pricing')}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
