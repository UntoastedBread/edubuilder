import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import de from './translations/de';
import ja from './translations/ja';

const translations = { en, es, fr, de, ja };

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espa\u00f1ol' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '\u65e5\u672c\u8a9e' },
];

export function detectLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language?.slice(0, 2) || 'en';
  return translations[lang] ? lang : 'en';
}

export function getTranslator(locale) {
  const dict = translations[locale] || translations.en;
  const fallback = translations.en;

  return function t(key, params) {
    let str = dict[key] || fallback[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}
