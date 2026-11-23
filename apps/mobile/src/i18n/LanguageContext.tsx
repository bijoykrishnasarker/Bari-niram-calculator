import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import enTranslations from './en.json';

export type Language = 'bn' | 'en';

let currentLanguage: Language = 'bn';

export function getLanguage(): Language {
  return currentLanguage;
}

export function tr(key: string, defaultVal?: string): string {
  if (currentLanguage === 'bn') {
    return defaultVal ?? key;
  }
  return (enTranslations as Record<string, string>)[key] ?? defaultVal ?? key;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultVal?: string) => string;
  tr: (key: string, defaultVal?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  t: (key: string, defaultVal?: string) => defaultVal ?? key,
  tr,
});

const LANGUAGE_STORAGE_KEY = '@homexbd_app_language_v1';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('bn');

  useEffect(() => {
    async function loadLang() {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'en' || saved === 'bn') {
          currentLanguage = saved;
          setLanguageState(saved);
        }
      } catch {
        // Fallback to Bangla
      }
    }
    void loadLang();
  }, []);

  const setLanguage = (lang: Language) => {
    currentLanguage = lang;
    setLanguageState(lang);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key: string, defaultVal?: string): string => {
    if (language === 'bn') {
      return defaultVal ?? key;
    }
    return (enTranslations as Record<string, string>)[key] ?? defaultVal ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
