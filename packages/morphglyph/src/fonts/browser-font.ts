import type { FontHandle } from './font';

type Entry = { face: FontFace; ready: Promise<FontFace>; users: number };
const faces = new WeakMap<FontHandle, WeakMap<Document, Entry>>();
let nextFamily = 0;

/** Register the same bytes as the SVG outlines, with metrics pinned to our baseline. */
export function acquireBrowserFont(handle: FontHandle, owner: Document) {
  let documents = faces.get(handle);
  if (!documents) {
    documents = new WeakMap();
    faces.set(handle, documents);
  }
  let entry = documents.get(owner);
  if (!entry) {
    const units = handle.font.unitsPerEm;
    const face = new FontFace(
      `MorphGlyph-${++nextFamily}`,
      handle.data ?? handle.font.toArrayBuffer(),
      {
        ascentOverride: `${(handle.font.ascender / units) * 100}%`,
        descentOverride: `${(-handle.font.descender / units) * 100}%`,
        lineGapOverride: '0%',
      },
    );
    entry = { face, ready: face.load(), users: 0 };
    documents.set(owner, entry);
  }
  const current = entry;
  current.users++;
  let released = false;
  return {
    ready: current.ready.then((face) => {
      if (!released) owner.fonts.add(face);
      return face.family;
    }),
    release() {
      if (released) return;
      released = true;
      if (--current.users === 0) {
        owner.fonts.delete(current.face);
        documents!.delete(owner);
      }
    },
  };
}
