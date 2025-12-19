import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  applyTheme: (colors: ThemeColors) => void;
}

const defaultColors: ThemeColors = {
  primaryColor: '#1E40AF',
  secondaryColor: '#3B82F6',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const colors: ThemeColors = {
    primaryColor: user?.company?.primaryColor || defaultColors.primaryColor,
    secondaryColor: user?.company?.secondaryColor || defaultColors.secondaryColor,
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
    <ThemeContext.Provider value={{ colors, applyTheme }}>
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
