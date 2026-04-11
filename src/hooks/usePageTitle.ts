import { useEffect } from 'react';

/**
 * Sets the page title reactively.
 * Default: "Studora · {title}"
 * With section: usePageTitle('Bancas', 'Admin') → "Studora · Admin · Bancas"
 */
export function usePageTitle(title?: string, section?: string) {
  useEffect(() => {
    const parts = ['Studora'];
    if (section) parts.push(section);
    if (title) parts.push(title);
    document.title = parts.join(' · ');
    return () => {
      document.title = 'Studora';
    };
  }, [title, section]);
}
