import React, { createContext, useContext, useEffect, useState } from 'react';
import { defineTheme, Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export type PortalColorMode = 'light' | 'dark';

export const portalTheme = defineTheme({
  name: 'zema-portal',
  extends: neutralTheme,
  tokens: {
    '--color-accent': ['#B85C38', '#E28A5D'],
    '--color-accent-muted': ['rgba(184, 92, 56, 0.12)', 'rgba(226, 138, 93, 0.16)'],
    '--color-text-accent': ['#98472B', '#F0A27A'],
    '--color-on-accent': ['#FFFFFF', '#FFFFFF'],
    '--color-background-body': ['#F7F5EF', '#111713'],
    '--color-background-surface': ['#F0EDE4', '#19221D'],
    '--color-background-card': ['#FFFDF8', '#1A241E'],
    '--color-background-muted': ['#ECE8DD', '#253129'],
    '--color-border': ['#E4DFD3', '#2C3930'],
    '--color-border-emphasized': ['#D1C9B9', '#425247'],
    '--color-text-primary': ['#202820', '#F5F2E9'],
    '--color-text-secondary': ['#687267', '#A4AEA2'],
    '--font-family-heading': "'Fraunces', 'Noto Sans Ethiopic', Georgia, serif",
    '--font-family-body': "'Manrope', 'Noto Sans Ethiopic', system-ui, sans-serif",
    '--font-family-code': "'JetBrains Mono', 'Noto Sans Ethiopic', ui-monospace, monospace",
  },
});

interface ThemeContextValue {
  mode: PortalColorMode;
  setMode: (mode: PortalColorMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'amharic_lyrics_portal_theme';

export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PortalColorMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }, [mode]);

  const setMode = (next: PortalColorMode) => setModeState(next);
  const toggleMode = () => setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));

  return React.createElement(
    ThemeModeContext.Provider,
    { value: { mode, setMode, toggleMode } },
    React.createElement(Theme, { theme: portalTheme, mode, children })
  );
}

export function usePortalTheme() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('usePortalTheme must be used inside PortalThemeProvider');
  }
  return ctx;
}
