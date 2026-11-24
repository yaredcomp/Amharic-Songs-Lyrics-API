import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase.ts';

export interface PortalUser {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
}

interface AuthState {
  user: PortalUser | null;
  isLoading: boolean;
  authMode: 'firebase' | 'jwt' | null;
  sessionApiKey: string;
  setSessionApiKey: (key: string) => void;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  bootstrapAdmin: (input: {
    name: string;
    email: string;
    password: string;
    passcode: string;
  }) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  updateLocalUser: (user: PortalUser) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'firebase' | 'jwt' | null>(null);
  const [sessionApiKey, setSessionApiKey] = useState('');

  // Keep tokens strictly in React memory (never localStorage/sessionStorage)
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<FirebaseUser | null>(null);

  const fetchMeWithToken = useCallback(async (token: string): Promise<PortalUser | null> => {
    const res = await fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data?.user ?? null;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      firebaseUserRef.current = fbUser;
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          accessTokenRef.current = idToken;
          const profile = await fetchMeWithToken(idToken);
          if (profile) {
            setUser(profile);
            setAuthMode('firebase');
          }
        } catch (err) {
          console.error('Failed to sync Firebase user:', err);
        }
      } else if (authMode === 'firebase') {
        accessTokenRef.current = null;
        setUser(null);
        setAuthMode(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [authMode, fetchMeWithToken]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (authMode === 'firebase' && firebaseUserRef.current) {
      try {
        const freshToken = await firebaseUserRef.current.getIdToken(true);
        accessTokenRef.current = freshToken;
        return true;
      } catch {
        return false;
      }
    }

    if (authMode === 'jwt' && refreshTokenRef.current) {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        accessTokenRef.current = json.data.accessToken;
        refreshTokenRef.current = json.data.refreshToken;
        setUser(json.data.user);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [authMode]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      if (authMode === 'firebase' && firebaseUserRef.current) {
        accessTokenRef.current = await firebaseUserRef.current.getIdToken();
      }
      const headers = new Headers(init.headers);
      if (accessTokenRef.current) {
        headers.set('Authorization', `Bearer ${accessTokenRef.current}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      let response = await fetch(input, { ...init, headers });
      if (response.status === 401 && (await refreshSession())) {
        const retryHeaders = new Headers(init.headers);
        if (accessTokenRef.current) {
          retryHeaders.set('Authorization', `Bearer ${accessTokenRef.current}`);
        }
        if (init.body && !retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json');
        }
        response = await fetch(input, { ...init, headers: retryHeaders });
      }
      return response;
    },
    [authMode, refreshSession]
  );

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    firebaseUserRef.current = cred.user;
    const idToken = await cred.user.getIdToken();
    accessTokenRef.current = idToken;
    const profile = await fetchMeWithToken(idToken);
    if (!profile) {
      throw new Error('Failed to synchronize account with backend');
    }
    setUser(profile);
    setAuthMode('firebase');
  };

  const loginWithEmail = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Sign in failed');
    }
    accessTokenRef.current = json.data.accessToken;
    refreshTokenRef.current = json.data.refreshToken;
    setUser(json.data.user);
    setAuthMode('jwt');
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Registration failed');
    }
    accessTokenRef.current = json.data.accessToken;
    refreshTokenRef.current = json.data.refreshToken;
    setUser(json.data.user);
    setAuthMode('jwt');
  };

  const bootstrapAdmin = async (input: {
    name: string;
    email: string;
    password: string;
    passcode?: string;
  }) => {
    const res = await fetch('/api/v1/auth/bootstrap-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Admin setup failed');
    }
    accessTokenRef.current = json.data.accessToken;
    refreshTokenRef.current = json.data.refreshToken;
    setUser(json.data.user);
    setAuthMode('jwt');
  };

  const logout = async () => {
    if (authMode === 'jwt' && refreshTokenRef.current) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
      }).catch(() => undefined);
    }
    if (firebaseUserRef.current) {
      await signOut(auth).catch(() => undefined);
    }
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    firebaseUserRef.current = null;
    setUser(null);
    setAuthMode(null);
  };

  const updateLocalUser = (nextUser: PortalUser) => setUser(nextUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authMode,
        sessionApiKey,
        setSessionApiKey,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        bootstrapAdmin,
        refreshSession,
        logout,
        authFetch,
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
