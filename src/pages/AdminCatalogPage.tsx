import React, { useCallback, useEffect, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Dialog,
  DialogHeader,
  Drawer,
  DrawerHeader,
  Layout,
  LayoutContent,
  LayoutFooter,
  Selector,
  Switch,
  Table,
  TextArea,
  TextInput,
  useToast,
} from '@astryxdesign/core';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { PortalRoute } from '../lib/routes.ts';

type LyricsRow = {
  id: string;
  title: string;
  titleTranslit: string;
  artist: string;
  album: string;
  lyrics: string;
  language: string;
  genre: string;
  releaseYear: number | null;
  views: number;
  createdAt: string;
};

type AdminKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  ownerEmail: string | null;
  ownerName: string | null;
  isActive: boolean;
  requestsUsed: number;
  dailyQuota: number;
};

type AuditLogRow = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const GENRES = ['Traditional', 'Tizita', 'Ethio-Jazz', 'Bati', 'Contemporary', 'Gospel'];

export function AdminCatalogPage({
  section,
  navigate,
}: {
  section: 'lyrics' | 'keys' | 'audit-logs';
  navigate: (route: PortalRoute) => void;
}) {
  const { user, authFetch } = useAuth();
  const toast = useToast();

  // Lyrics state
  const [lyricsList, setLyricsList] = useState<LyricsRow[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LyricsRow | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formTranslit, setFormTranslit] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formAlbum, setFormAlbum] = useState('');
  const [formGenre, setFormGenre] = useState('Traditional');
  const [formYear, setFormYear] = useState('');
  const [formLyrics, setFormLyrics] = useState('');
  const [saving, setSaving] = useState(false);

  // Admin keys & audit state
  const [adminKeys, setAdminKeys] = useState<AdminKeyRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditPage, setAuditPage] = useState(1);

  const loadLyrics = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    const qs = new URLSearchParams({ page: String(page), limit: '10', sortBy: 'createdAt', order: 'desc' });
    if (search.trim()) qs.set('search', search.trim());
    if (genreFilter) qs.set('genre', genreFilter);
    const res = await authFetch(`/api/v1/admin/lyrics?${qs.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setLyricsList(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
    }
  }, [user, authFetch, page, search, genreFilter]);

  const loadAdminKeys = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    const res = await authFetch('/api/v1/admin/api-keys');
    if (res.ok) {
      const json = await res.json();
      setAdminKeys(json.data || []);
    }
  }, [user, authFetch]);

  const loadAuditLogs = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    const res = await authFetch(`/api/v1/admin/audit-logs?page=${auditPage}&limit=15`);
    if (res.ok) {
      const json = await res.json();
      setAuditLogs(json.data || []);
    }
  }, [user, authFetch, auditPage]);

  useEffect(() => {
    if (section === 'lyrics') void loadLyrics();
    if (section === 'keys') void loadAdminKeys();
    if (section === 'audit-logs') void loadAuditLogs();
  }, [section, loadLyrics, loadAdminKeys, loadAuditLogs]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="space-y-4">
        <Banner
          status="warning"
          title="Administrator Access Required"
          description={
            user
              ? `You are signed in as ${user.email} (${user.role}). Sign in with the administrator account or claim initial admin access on first setup to manage the catalog.`
              : 'Sign in with an administrator account to manage Amharic lyrics, platform API keys, and audit logs.'
          }
        />
        <div className="flex gap-3">
          <Button label="Sign In" variant="primary" onClick={() => navigate('/login')} />
          <Button label="Back to Overview" variant="secondary" onClick={() => navigate('/dashboard')} />
        </div>
      </div>
    );
  }

  const openCreateDrawer = () => {
    setEditingId(null);
    setFormTitle('');
    setFormTranslit('');
    setFormArtist('');
    setFormAlbum('');
    setFormGenre('Traditional');
    setFormYear('');
    setFormLyrics('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (row: LyricsRow) => {
    setEditingId(row.id);
    setFormTitle(row.title);
    setFormTranslit(row.titleTranslit);
    setFormArtist(row.artist);
    setFormAlbum(row.album);
    setFormGenre(row.genre);
    setFormYear(row.releaseYear ? String(row.releaseYear) : '');
    setFormLyrics(row.lyrics);
    setDrawerOpen(true);
  };

  const handleSaveLyrics = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        titleTranslit: formTranslit.trim(),
        artist: formArtist.trim(),
        album: formAlbum.trim(),
        genre: formGenre,
        language: 'am',
        releaseYear: formYear.trim() ? Number(formYear) : null,
        lyrics: formLyrics.trim(),
      };

      const url = editingId ? `/api/v1/admin/lyrics/${editingId}` : '/api/v1/admin/lyrics';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Idempotency-Key': `lyrics-${method}-${editingId || 'new'}-${Date.now()}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to save lyrics');

      setDrawerOpen(false);
      toast({ body: editingId ? 'Lyrics updated' : 'Lyrics created', type: 'info' });
      await loadLyrics();
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLyrics = async () => {
    if (!deleteTarget) return;
    const res = await authFetch(`/api/v1/admin/lyrics/${deleteTarget.id}`, {
      method: 'DELETE',
    });
    setDeleteTarget(null);
    if (res.ok) {
      toast({ body: 'Track soft-deleted', type: 'info' });
      await loadLyrics();
    } else {
      toast({ body: 'Delete failed', type: 'error' });
    }
  };

  if (section === 'keys') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">All Platform API Keys</h1>
          <p className="text-sm text-secondary mt-1">
            Inspect developer key quotas and toggle active status across all accounts.
          </p>
        </div>

        <Card padding={4}>
          <Table<AdminKeyRow>
            data={adminKeys}
            density="compact"
            hasHover
            columns={[
              { key: 'name', header: 'Key Name' },
              {
                key: 'keyPrefix',
                header: 'Prefix',
                renderCell: (r) => <span className="font-mono text-xs">{r.keyPrefix}...</span>,
              },
              {
                key: 'ownerEmail',
                header: 'Owner',
                renderCell: (r) => <span className="text-xs text-secondary">{r.ownerEmail || '—'}</span>,
              },
              {
                key: 'requestsUsed',
                header: 'Usage',
                renderCell: (r) => (
                  <span className="font-mono text-xs tabular-nums">
                    {r.requestsUsed.toLocaleString()} / {r.dailyQuota.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'isActive',
                header: 'Active',
                renderCell: (r) => (
                  <Switch
                    label={`Toggle ${r.name}`}
                    isLabelHidden
                    value={r.isActive}
                    onChange={async (checked) => {
                      const res = await authFetch(`/api/v1/admin/api-keys/${r.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: checked }),
                      });
                      if (res.ok) {
                        toast({ body: 'Key updated', type: 'info' });
                        void loadAdminKeys();
                      }
                    }}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                renderCell: (r) => (
                  <Button
                    label="Revoke"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    icon={<Trash2 className="w-3.5 h-3.5 text-status-error" />}
                    onClick={async () => {
                      const res = await authFetch(`/api/v1/admin/api-keys/${r.id}`, {
                        method: 'DELETE',
                      });
                      if (res.ok) {
                        toast({ body: 'Key revoked', type: 'info' });
                        void loadAdminKeys();
                      }
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    );
  }

  if (section === 'audit-logs') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Audit Logs</h1>
            <p className="text-sm text-secondary mt-1">
              Immutable trail of administrative lyrics edits, API key mutations, and registrations.
            </p>
          </div>
          <Button
            label="Refresh"
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => void loadAuditLogs()}
          />
        </div>

        <Card padding={4}>
          <Table<AuditLogRow>
            data={auditLogs}
            density="compact"
            dividers="rows"
            columns={[
              {
                key: 'action',
                header: 'Action',
                renderCell: (r) => <span className="font-mono text-xs font-medium">{r.action}</span>,
              },
              { key: 'entityType', header: 'Entity' },
              {
                key: 'actorEmail',
                header: 'Actor',
                renderCell: (r) => <span className="text-xs text-secondary">{r.actorEmail || 'System'}</span>,
              },
              {
                key: 'metadata',
                header: 'Metadata',
                renderCell: (r) => (
                  <span className="font-mono text-xs text-secondary truncate max-w-xs block">
                    {JSON.stringify(r.metadata)}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                header: 'Timestamp',
                renderCell: (r) => (
                  <span className="text-xs text-secondary tabular-nums">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                ),
              },
            ]}
          />
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              label="Previous"
              size="sm"
              variant="secondary"
              isDisabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
            />
            <Button
              label="Next"
              size="sm"
              variant="secondary"
              isDisabled={auditLogs.length < 15}
              onClick={() => setAuditPage((p) => p + 1)}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Amharic Lyrics Catalog</h1>
          <p className="text-sm text-secondary mt-1">
            Create, update, and soft-delete Ge'ez lyrics records served over the public REST API.
          </p>
        </div>
        <Button
          label="Add Track"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateDrawer}
        />
      </div>

      <Card padding={4}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Search catalog"
              isLabelHidden
              placeholder="Search title, artist, or Amharic lyrics..."
              value={search}
              onChange={(val) => {
                setPage(1);
                setSearch(val);
              }}
              hasClear
              width="100%"
            />
            <Selector
              label="Filter by genre"
              isLabelHidden
              value={genreFilter}
              onChange={(val) => {
                setPage(1);
                setGenreFilter(typeof val === 'string' ? val : '');
              }}
              width="100%"
              options={[
                { value: '', label: 'All Genres' },
                ...GENRES.map((g) => ({ value: g, label: g })),
              ]}
            />
          </div>

          <Table<LyricsRow>
            data={lyricsList}
            density="balanced"
            hasHover
            columns={[
              {
                key: 'title',
                header: 'Title',
                renderCell: (r) => (
                  <div>
                    <div className="font-medium text-primary">{r.title}</div>
                    <div className="text-xs text-secondary">{r.titleTranslit}</div>
                  </div>
                ),
              },
              { key: 'artist', header: 'Artist' },
              { key: 'album', header: 'Album' },
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
              {
                key: 'actions',
                header: 'Actions',
                renderCell: (r) => (
                  <div className="flex items-center gap-1">
                    <Button
                      label="Edit"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      icon={<Pencil className="w-3.5 h-3.5" />}
                      onClick={() => openEditDrawer(r)}
                    />
                    <Button
                      label="Delete"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      icon={<Trash2 className="w-3.5 h-3.5 text-status-error" />}
                      onClick={() => setDeleteTarget(r)}
                    />
                  </div>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-secondary tabular-nums">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                label="Previous"
                size="sm"
                variant="secondary"
                isDisabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                label="Next"
                size="sm"
                variant="secondary"
                isDisabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Create / Edit Lyrics Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        side="end"
        width={520}
        purpose="form"
        label={editingId ? 'Edit Amharic Lyrics' : 'Add Amharic Lyrics'}
      >
        <Layout
          header={
            <DrawerHeader
              title={editingId ? 'Edit Track Lyrics' : 'Add Amharic Track'}
              onOpenChange={setDrawerOpen}
            />
          }
          content={
            <LayoutContent>
              <form id="lyrics-editor-form" onSubmit={handleSaveLyrics} className="space-y-4 py-2">
                <TextInput
                  label="Track Title (Amharic / Bilingual)"
                  placeholder="ትዝታ (Tizita)"
                  value={formTitle}
                  onChange={setFormTitle}
                  isRequired
                  width="100%"
                />
                <TextInput
                  label="Transliterated Title"
                  placeholder="Tizita"
                  value={formTranslit}
                  onChange={setFormTranslit}
                  isRequired
                  width="100%"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput
                    label="Artist"
                    placeholder="Mahmoud Ahmed"
                    value={formArtist}
                    onChange={setFormArtist}
                    isRequired
                    width="100%"
                  />
                  <TextInput
                    label="Album"
                    placeholder="Ere Mela Mela"
                    value={formAlbum}
                    onChange={setFormAlbum}
                    isRequired
                    width="100%"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Selector
                    label="Genre"
                    value={formGenre}
                    onChange={(val) => typeof val === 'string' && setFormGenre(val)}
                    width="100%"
                    options={GENRES.map((g) => ({ value: g, label: g }))}
                  />
                  <TextInput
                    label="Release Year"
                    placeholder="1975"
                    value={formYear}
                    onChange={setFormYear}
                    width="100%"
                  />
                </div>
                <TextArea
                  label="Full Amharic Lyrics"
                  placeholder="ትዝታዬ መጣ የድሮው ትዝታ..."
                  rows={10}
                  value={formLyrics}
                  onChange={setFormLyrics}
                  isRequired
                  width="100%"
                />
              </form>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div className="flex justify-end gap-2 w-full">
                <Button label="Cancel" variant="ghost" onClick={() => setDrawerOpen(false)} />
                <Button
                  type="submit"
                  form="lyrics-editor-form"
                  label={editingId ? 'Save Changes' : 'Create Track'}
                  variant="primary"
                  isLoading={saving}
                />
              </div>
            </LayoutFooter>
          }
        />
      </Drawer>

      {/* Soft Delete Dialog */}
      <Dialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        width={420}
      >
        <Layout
          header={
            <DialogHeader
              title="Delete Track"
              onOpenChange={(open) => {
                if (!open) setDeleteTarget(null);
              }}
            />
          }
          content={
            <LayoutContent>
              <p className="text-sm text-secondary py-2">
                Soft-delete <strong className="text-primary">{deleteTarget?.title}</strong> by{' '}
                {deleteTarget?.artist}? It will immediately stop appearing in public API queries.
              </p>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div className="flex justify-end gap-2 w-full">
                <Button label="Cancel" variant="ghost" onClick={() => setDeleteTarget(null)} />
                <Button
                  label="Delete Track"
                  variant="destructive"
                  onClick={() => void handleDeleteLyrics()}
                />
              </div>
            </LayoutFooter>
          }
        />
      </Dialog>
    </div>
  );
}
