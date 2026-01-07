import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import modular locales
import esMX from './locales/es-MX';
import enUS from './locales/en-US';

// Available languages
export const LANGUAGES = {
  'es-MX': { code: 'es-MX', name: 'Español (Latinoamérica)', flag: '🇲🇽' },
  'en-US': { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Get saved language from localStorage or system config
const getSavedLanguage = (): LanguageCode => {
  // First check localStorage
  const savedLang = localStorage.getItem('language');
  if (savedLang && savedLang in LANGUAGES) {
    return savedLang as LanguageCode;
  }
  // Default to Spanish for Latin American context
  return 'es-MX';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-MX': { translation: esMX },
      'en-US': { translation: enUS },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'es-MX',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Function to change language
export const changeLanguage = (lang: LanguageCode) => {
  localStorage.setItem('language', lang);
  i18n.changeLanguage(lang);
};

// Function to get current language
export const getCurrentLanguage = (): LanguageCode => {
  return i18n.language as LanguageCode || 'es-MX';
};

export default i18n;
