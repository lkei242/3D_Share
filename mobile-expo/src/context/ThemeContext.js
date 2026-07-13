
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme_preference';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); 

  
  
  const [override, setOverride] = useState(null);
  const [isReady, setIsReady] = useState(false);

  
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setOverride(saved);
        }
      } catch (e) {
        console.log('No se pudo leer la preferencia de tema guardada', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const scheme = override ?? systemScheme ?? 'light';
  const isDark = scheme === 'dark';
  const themeMode = override ?? 'auto';

  
  const setDarkMode = async (value) => {
    const next = value ? 'dark' : 'light';
    setOverride(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      console.log('No se pudo guardar la preferencia de tema', e);
    }
  };

  
  const followSystem = async () => {
    setOverride(null);
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    } catch (e) {
      console.log('No se pudo borrar la preferencia de tema', e);
    }
  };

  const setThemeMode = async (mode) => {
  if (mode === 'auto') {
    await followSystem();
  } else if (mode === 'light' || mode === 'dark') {
    setOverride(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.log('No se pudo guardar la preferencia de tema', e);
    }
  }
  };

  return (
    <ThemeContext.Provider value={{ scheme, isDark, themeMode, setDarkMode, setThemeMode, followSystem, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme debe usarse dentro de un <ThemeProvider>');
  }
  return ctx;
}