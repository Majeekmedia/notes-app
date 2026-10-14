/**
 * Core domain type for the notes app.
 *
 * Timestamps are epoch milliseconds (`Date.now()`), not Date objects, because
 * this shape is what gets JSON-serialised into AsyncStorage.
 */
export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

/** Bump the `v1` suffix whenever the persisted shape changes. */
export const NOTE_STORAGE_KEY = 'notes-app/notes/v1';

/**
 * Generates a collision-resistant id without pulling in a native crypto module.
 * Combined timestamp + random suffix keeps ids roughly sortable by creation time.
 */
export function createNoteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Builds a blank, unsaved note. */
export function createEmptyNote(): Note {
  const now = Date.now();
  return { id: createNoteId(), title: '', body: '', createdAt: now, updatedAt: now };
}

/** Title used in the list when the user never typed one. */
export function noteDisplayTitle(note: Note): string {
  const trimmed = note.title.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled note';
}

/** Single-line body preview, or empty string when there is no body. */
export function notePreview(note: Note): string {
  return note.body.replace(/\s+/g, ' ').trim();
}

/** Runtime guard so corrupted or hand-edited storage cannot crash the list. */
export function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number'
  );
}
