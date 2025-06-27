import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations asynchronously to improve initial load time
const loadTranslations = async () => {
  const [translationEN, translationFR, translationES] = await Promise.all([
    import('./locales/en/translation.json'),
    import('./locales/fr/translation.json'),
    import('./locales/es/translation.json')
  ]);

  // the translations
  const resources = {
    en: {
      translation: translationEN.default
    },
    fr: {
      translation: translationFR.default
    },
    es: {
      translation: translationES.default
    }
  };

  return resources;
};

// Initialize i18next without blocking
const initI18n = async () => {
  const resources = await loadTranslations();
  
  await i18n
    // detect user language
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next
    .use(initReactI18next)
    // init i18next
    .init({
      resources,
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
};

// Initialize i18n
initI18n();

export default i18n;