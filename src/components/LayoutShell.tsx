import React, { useState } from 'react';
import {
  Button,
  Divider,
  Drawer,
  DrawerHeader,
  Layout,
  LayoutContent,
} from '@astryxdesign/core';
import {
  BarChart3,
  BookOpen,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sun,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';
import { isConsoleRoute, PortalRoute } from '../lib/routes.ts';
import { usePortalTheme } from '../lib/theme.ts';

interface LayoutShellProps {
  route: PortalRoute;
  navigate: (next: PortalRoute) => void;
  children: React.ReactNode;
}

const CONSOLE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/api-keys': 'API Keys',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/admin/lyrics': 'Catalog Management',
  '/admin/keys': 'Platform Keys',
  '/admin/audit-logs': 'Audit Logs',
};

export function LayoutShell({ route, navigate, children }: LayoutShellProps) {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = usePortalTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const consoleMode = isConsoleRoute(route);

  const handleNav = (next: PortalRoute) => {
    setMobileMenuOpen(false);
    navigate(next);
  };

  if (consoleMode) {
    const devNavItems: { label: string; route: PortalRoute; icon: React.ReactNode }[] = [
      { label: 'Overview', route: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'API Keys', route: '/api-keys', icon: <KeyRound className="w-4 h-4" /> },
      { label: 'Analytics', route: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { label: 'API Explorer', route: '/explorer', icon: <Terminal className="w-4 h-4" /> },
      { label: 'Settings', route: '/settings', icon: <Settings className="w-4 h-4" /> },
    ];

    const adminNavItems: { label: string; route: PortalRoute; icon: React.ReactNode }[] = [
      { label: 'Lyrics Catalog', route: '/admin/lyrics', icon: <Music2 className="w-4 h-4" /> },
      { label: 'All API Keys', route: '/admin/keys', icon: <ShieldCheck className="w-4 h-4" /> },
      { label: 'Audit Logs', route: '/admin/audit-logs', icon: <FileText className="w-4 h-4" /> },
    ];

    const SidebarContent = (collapsed: boolean) => (
      <div className={`console-sidebar-content flex flex-col h-full justify-between py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className="space-y-6">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
            <button
              type="button"
              onClick={() => handleNav('/')}
              aria-label="ZemaLyrics home"
              title={collapsed ? 'ZemaLyrics home' : undefined}
              className="brand-lockup text-primary hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="brand-mark" aria-hidden="true">
                <Music2 className="w-4 h-4" />
              </span>
              {!collapsed && <span className="brand-wordmark">ZemaLyrics</span>}
            </button>
            {!collapsed && (
              <button
                type="button"
                aria-label="Collapse navigation"
                title="Collapse navigation"
                onClick={() => setSidebarCollapsed(true)}
                className="console-icon-button hidden lg:inline-flex"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {collapsed ? (
              <button
                type="button"
                aria-label="Expand navigation"
                title="Expand navigation"
                onClick={() => setSidebarCollapsed(false)}
                className="console-icon-button mx-auto mb-2 hidden lg:flex"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            ) : (
              <div className="console-sidebar-label px-3 pb-1">Workspace</div>
            )}
            {devNavItems.map((item) => {
              const active = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`console-nav-item w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-accent-muted text-accent'
                      : 'text-secondary hover:text-primary hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          <Divider />

          {user?.role === 'ADMIN' && (
            <div className="space-y-1">
              {!collapsed && <div className="console-sidebar-label px-3 pb-1">Administration</div>}
              {adminNavItems.map((item) => {
                const active = route === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`console-nav-item w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-accent-muted text-accent'
                        : 'text-secondary hover:text-primary hover:bg-muted'
                    }`}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <Divider />

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleNav('/docs')}
              aria-label="Documentation"
              title={collapsed ? 'Documentation' : undefined}
              className={`console-nav-item w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-muted transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
            >
              <BookOpen className="w-4 h-4" />
              {!collapsed && <span>Documentation</span>}
            </button>
          </div>
        </div>

        <div className={`${collapsed ? 'px-1' : 'px-3'} pt-4 border-t border-border space-y-3`}>
          {user ? (
            <div className="space-y-2">
              {!collapsed && (
                <>
                  <div className="text-sm font-medium text-primary truncate">{user.name}</div>
                  <div className="text-xs text-secondary truncate">
                    {user.email} · {user.role === 'ADMIN' ? 'Admin' : 'Developer'}
                  </div>
                </>
              )}
              <Button
                label="Sign out"
                variant="ghost"
                size="sm"
                width={collapsed ? undefined : '100%'}
                isIconOnly={collapsed}
                icon={<LogOut className="w-3.5 h-3.5" />}
                onClick={async () => {
                  await logout();
                  handleNav('/');
                }}
              />
            </div>
          ) : (
            <Button
              label="Sign in"
              variant="primary"
              size="sm"
              width={collapsed ? undefined : '100%'}
              isIconOnly={collapsed}
              icon={<LogIn className="w-3.5 h-3.5" />}
              onClick={() => handleNav('/login')}
            />
          )}
        </div>
      </div>
    );

    return (
      <div className="console-layout min-h-screen flex text-primary">
        <aside
          className={`console-sidebar hidden lg:flex ${sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'} shrink-0 flex-col border-r`}
        >
          {SidebarContent(sidebarCollapsed)}
        </aside>

        <Drawer
          isOpen={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          side="start"
          width={272}
          label="Console navigation"
        >
          <Layout
            header={<DrawerHeader title="Navigation" onOpenChange={setMobileMenuOpen} />}
            content={<LayoutContent>{SidebarContent(false)}</LayoutContent>}
          />
        </Drawer>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="console-topbar h-16 border-b px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="console-icon-button lg:hidden"
              >
                <Menu className="w-4 h-4" />
              </button>
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="text-secondary hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Console
                </button>
                <span className="text-secondary" aria-hidden="true">
                  /
                </span>
                <span className="font-medium text-primary truncate">
                  {CONSOLE_TITLES[route] || 'Workspace'}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                variant="ghost"
                size="sm"
                isIconOnly
                icon={mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                onClick={toggleMode}
              />
              <Button
                label="API Explorer"
                variant="secondary"
                size="sm"
                icon={<Terminal className="w-4 h-4" />}
                onClick={() => handleNav('/explorer')}
              />
            </div>
          </header>

          <main key={route} className="console-content flex-1 p-4 sm:p-6 lg:p-9 w-full mx-auto">
            <div className="route-transition">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="public-layout min-h-screen flex flex-col text-primary">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="public-topbar sticky top-0 z-30 border-b backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="brand-lockup text-primary hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="brand-mark" aria-hidden="true">
              <Music2 className="w-4 h-4" />
            </span>
            <span className="brand-wordmark">ZemaLyrics</span>
          </button>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-secondary">
            <button
              type="button"
              onClick={() => handleNav('/docs')}
              className={`inline-flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === '/docs' ? 'text-primary underline underline-offset-8' : ''
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </button>
            <button
              type="button"
              onClick={() => handleNav('/explorer')}
              className={`inline-flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === '/explorer' ? 'text-primary underline underline-offset-8' : ''
              }`}
            >
              <Terminal className="w-4 h-4" />
              API Explorer
            </button>
            <button
              type="button"
              onClick={() => handleNav('/pricing')}
              className={`inline-flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === '/pricing' ? 'text-primary underline underline-offset-8' : ''
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleNav('/dashboard')}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Console
            </button>
            {!user && (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className={`inline-flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  route === '/login' ? 'text-primary underline underline-offset-8' : ''
                }`}
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              variant="ghost"
              size="sm"
              isIconOnly
              icon={mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              onClick={toggleMode}
            />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              className="console-icon-button md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Button
              label={user ? 'Dashboard' : 'Get API Key'}
              variant="primary"
              size="md"
              icon={user ? <LayoutDashboard className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              onClick={() => handleNav(user ? '/dashboard' : '/register')}
            />
          </div>
        </div>
      </header>

      <Drawer
        isOpen={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        side="end"
        width={280}
        label="Portal navigation"
      >
        <Layout
          header={<DrawerHeader title="ZemaLyrics API" onOpenChange={setMobileMenuOpen} />}
          content={
            <LayoutContent>
              <div className="flex flex-col gap-2 py-2">
                <Button
                  label="Home"
                  variant="ghost"
                  width="100%"
                  icon={<Music2 className="w-4 h-4" />}
                  onClick={() => handleNav('/')}
                />
                <Button
                  label="Docs"
                  variant="ghost"
                  width="100%"
                  icon={<BookOpen className="w-4 h-4" />}
                  onClick={() => handleNav('/docs')}
                />
                <Button
                  label="API Explorer"
                  variant="ghost"
                  width="100%"
                  icon={<Terminal className="w-4 h-4" />}
                  onClick={() => handleNav('/explorer')}
                />
                <Button
                  label="Pricing"
                  variant="ghost"
                  width="100%"
                  icon={<KeyRound className="w-4 h-4" />}
                  onClick={() => handleNav('/pricing')}
                />
                <Button
                  label="Console"
                  variant="ghost"
                  width="100%"
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  onClick={() => handleNav('/dashboard')}
                />
                {!user && (
                  <Button
                    label="Sign in"
                    variant="secondary"
                    width="100%"
                    icon={<LogIn className="w-4 h-4" />}
                    onClick={() => handleNav('/login')}
                  />
                )}
              </div>
            </LayoutContent>
          }
        />
      </Drawer>

      <main key={route} className="flex-1">
        <div className="route-transition">{children}</div>
      </main>

      <footer className="public-footer border-t border-border bg-surface mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-1.5">
            <div className="text-base font-semibold text-primary">ZemaLyrics API</div>
            <p className="text-sm text-secondary">
              Structured Amharic music lyrics and artist metadata for modern applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-secondary">
            <button
              type="button"
              onClick={() => handleNav('/docs')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Swagger UI
            </a>
            <a
              href="/api/openapi.yaml"
              download="openapi.yaml"
              className="hover:text-primary transition-colors"
            >
              OpenAPI 3.1
            </a>
            <a
              href="/api/postman-collection.json"
              download="amharic-lyrics-api.postman_collection.json"
              className="hover:text-primary transition-colors"
            >
              Postman Collection
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
