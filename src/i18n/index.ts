import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import uk from './uk.json';
import es from './es.json';

export const SUPPORTED_LOCALES = ['en', 'uk', 'es'] as const;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, uk: { translation: uk }, es: { translation: es } },
  lng: (typeof localStorage !== 'undefined' && localStorage.getItem('kids-locale')) || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(l: string): void {
  void i18n.changeLanguage(l);
  try {
    localStorage.setItem('kids-locale', l);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = l;
}

export default i18n;
