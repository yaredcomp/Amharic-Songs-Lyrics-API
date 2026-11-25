import { useCallback, useEffect, useState } from 'react';

export type PortalRoute =
  | '/'
  | '/docs'
  | '/explorer'
  | '/pricing'
  | '/login'
  | '/register'
  | '/dashboard'
  | '/api-keys'
  | '/analytics'
  | '/settings'
  | '/admin/lyrics'
  | '/admin/keys'
  | '/admin/audit-logs';

const KNOWN_ROUTES = new Set<PortalRoute>([
  '/',
  '/docs',
  '/explorer',
  '/pricing',
  '/login',
  '/register',
  '/dashboard',
  '/api-keys',
  '/analytics',
  '/settings',
  '/admin/lyrics',
  '/admin/keys',
  '/admin/audit-logs',
]);

export function normalizeRoute(pathname: string): PortalRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (KNOWN_ROUTES.has(clean as PortalRoute)) {
    return clean as PortalRoute;
  }
  return '/';
}

export function isConsoleRoute(route: PortalRoute): boolean {
  return (
    route === '/dashboard' ||
    route === '/api-keys' ||
    route === '/analytics' ||
    route === '/settings' ||
    route.startsWith('/admin/')
  );
}

export function usePortalNavigation() {
  const [route, setRoute] = useState<PortalRoute>(() =>
    typeof window === 'undefined' ? '/' : normalizeRoute(window.location.pathname)
  );

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: PortalRoute) => {
    if (typeof window !== 'undefined' && window.location.pathname !== next) {
      window.history.pushState({}, '', next);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return { route, navigate };
}
