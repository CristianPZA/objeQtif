import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationES from './locales/es/translation.json';

// Initialize i18n synchronously to prevent hooks order issues
i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18next
  .init({
    resources: {
      en: {
        translation: translationEN
      },
      fr: {
        translation: translationFR
      },
      es: {
        translation: translationES
      }
    },
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    load: 'languageOnly' // load only language code (e.g. 'en') and not region (e.g. 'en-US')
  });

// Export the initialized i18n instance
export default i18n;

// For backward compatibility with existing code
export const initI18n = async () => {
  // i18n is already initialized, so just return a resolved promise
  return Promise.resolve(i18n);
};