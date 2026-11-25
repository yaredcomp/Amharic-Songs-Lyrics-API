import React from 'react';
import { LayerProvider } from '@astryxdesign/core';
import { LayoutShell } from './components/LayoutShell.tsx';
import { AuthProvider, useAuth } from './lib/authContext.tsx';
import { usePortalNavigation } from './lib/routes.ts';
import { PortalThemeProvider } from './lib/theme.ts';
import { AdminCatalogPage } from './pages/AdminCatalogPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { ApiKeysPage } from './pages/ApiKeysPage.tsx';
import { AuthPage } from './pages/AuthPages.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DocsPage } from './pages/DocsPage.tsx';
import { ExplorerPage } from './pages/ExplorerPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PricingPage } from './pages/PricingPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

function PortalRouter() {
  const { route, navigate } = usePortalNavigation();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && route.startsWith('/admin/') && user?.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [isLoading, navigate, route, user?.role]);

  if (route.startsWith('/admin/') && (isLoading || user?.role !== 'ADMIN')) {
    return (
      <LayoutShell route="/dashboard" navigate={navigate}>
        <DashboardPage navigate={navigate} />
      </LayoutShell>
    );
  }

  const renderPage = () => {
    switch (route) {
      case '/':
        return <HomePage navigate={navigate} />;
      case '/docs':
        return <DocsPage navigate={navigate} />;
      case '/explorer':
        return <ExplorerPage navigate={navigate} />;
      case '/pricing':
        return <PricingPage navigate={navigate} />;
      case '/login':
        return <AuthPage mode="login" navigate={navigate} />;
      case '/register':
        return <AuthPage mode="register" navigate={navigate} />;
      case '/dashboard':
        return <DashboardPage navigate={navigate} />;
      case '/api-keys':
        return <ApiKeysPage navigate={navigate} />;
      case '/analytics':
        return <AnalyticsPage navigate={navigate} />;
      case '/settings':
        return <SettingsPage navigate={navigate} />;
      case '/admin/lyrics':
        return <AdminCatalogPage section="lyrics" navigate={navigate} />;
      case '/admin/keys':
        return <AdminCatalogPage section="keys" navigate={navigate} />;
      case '/admin/audit-logs':
        return <AdminCatalogPage section="audit-logs" navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <LayoutShell route={route} navigate={navigate}>
      {renderPage()}
    </LayoutShell>
  );
}

export default function App() {
  return (
    <PortalThemeProvider>
      <LayerProvider>
        <AuthProvider>
          <PortalRouter />
        </AuthProvider>
      </LayerProvider>
    </PortalThemeProvider>
  );
}
