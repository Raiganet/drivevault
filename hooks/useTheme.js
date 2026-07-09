import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'light';
    const darkMode = savedTheme === 'dark';
    setIsDark(darkMode);
    applyTheme(darkMode ? 'dark' : 'light');
  }, []);

  const applyTheme = (theme) => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      applyTheme(newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  return { isDark, isMounted, toggleTheme };
}
