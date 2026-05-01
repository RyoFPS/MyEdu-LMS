import { create } from 'zustand';
import type { Language } from '../i18n';
import { translations, type TranslationKeys } from '../i18n';

interface LanguageState {
  language: Language;
  t: TranslationKeys;
  setLanguage: (lang: Language) => void;
}

const savedLanguage = (localStorage.getItem('language') as Language) || 'en';

export const useLanguageStore = create<LanguageState>((set) => ({
  language: savedLanguage,
  t: translations[savedLanguage] || translations.en,

  setLanguage: (lang: Language) => {
    localStorage.setItem('language', lang);
    set({
      language: lang,
      t: translations[lang] || translations.en,
    });
  },
}));
