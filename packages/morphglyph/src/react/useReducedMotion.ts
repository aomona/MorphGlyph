import { useEffect, useState } from 'react';

export function useReducedMotion(setting: 'system' | 'always' | 'never') {
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystem(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return setting === 'always' || (setting === 'system' && system);
}
