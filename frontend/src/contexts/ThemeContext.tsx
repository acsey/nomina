import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  applyTheme: (colors: ThemeColors) => void;
}

const defaultColors: ThemeColors = {
  primaryColor: '#1E40AF',
  secondaryColor: '#3B82F6',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage key for theme preference
const THEME_STORAGE_KEY = 'nomina-theme-mode';

// Convierte hex a HSL para generar paletas de colores
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 217, s: 91, l: 60 }; // default blue

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Genera variantes de color para Tailwind
function generateColorPalette(hex: string, prefix: string) {
  const { h, s } = hexToHSL(hex);
  const cssVars: Record<string, string> = {};

  // Generar paleta de 50 a 950
  const lightness = [97, 94, 86, 77, 66, 54, 43, 32, 24, 18, 10];
  const names = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  names.forEach((name, i) => {
    cssVars[`--color-${prefix}-${name}`] = `hsl(${h}, ${s}%, ${lightness[i]}%)`;
  });

  return cssVars;
}

// Get initial theme from localStorage or system preference
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored;
  }
  return 'system';
}

// Check if system prefers dark mode
function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  // Calculate if we should use dark mode
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);

  const colors: ThemeColors = {
    primaryColor: user?.company?.primaryColor || defaultColors.primaryColor,
    secondaryColor: user?.company?.secondaryColor || defaultColors.secondaryColor,
  };

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const toggleDarkMode = () => {
    if (mode === 'system') {
      // If in system mode, switch to the opposite of current system preference
      setMode(systemPrefersDark ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setMode(mode === 'dark' ? 'light' : 'dark');
    }
  };

  const applyTheme = (themeColors: ThemeColors) => {
    const root = document.documentElement;

    // Generar y aplicar paleta de colores primarios
    const primaryPalette = generateColorPalette(themeColors.primaryColor, 'primary');
    const secondaryPalette = generateColorPalette(themeColors.secondaryColor, 'secondary');

    Object.entries({ ...primaryPalette, ...secondaryPalette }).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  useEffect(() => {
    applyTheme(colors);
  }, [user?.company?.primaryColor, user?.company?.secondaryColor]);

  return (
    <ThemeContext.Provider value={{ colors, mode, isDark, setMode, toggleDarkMode, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
