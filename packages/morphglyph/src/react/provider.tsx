import { createContext, useContext, type ReactNode } from 'react';
import type { FontSource } from '../fonts/font';

const FontContext = createContext<FontSource | undefined>(undefined);
export function MorphGlyphProvider({ font, children }: { font: FontSource; children: ReactNode }) {
  return <FontContext.Provider value={font}>{children}</FontContext.Provider>;
}
export const useSharedFont = () => useContext(FontContext);
