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
  /** Lowercase, de-duplicated, trimmed. Empty when the note has no tags. */
  tags: string[];
  /** Pinned notes sort above everything else. */
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

/**
 * Bump the `v1` suffix only for shape changes that cannot be migrated in place.
 *
 * `tags` and `pinned` were added without bumping: both are additive, so an older
 * note missing them is still readable once `normalizeNote()` supplies defaults.
 * Bumping the key would have made every existing note vanish from the list,
 * which is a much worse outcome than a one-line normaliser.
 */
export const NOTE_STORAGE_KEY = 'notes-app/notes/v1';

/** Longest a single tag may be, to keep chips from breaking the layout. */
export const MAX_TAG_LENGTH = 24;

/** Most tags a single note may carry. */
export const MAX_TAGS_PER_NOTE = 8;

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
  return {
    id: createNoteId(),
    title: '',
    body: '',
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
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

/**
 * Canonical form for a tag: trimmed, lowercased, and length-capped.
 *
 * Lowercasing is what makes `Work` and `work` the same tag, so filtering does not
 * silently split them into two.
 */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
}

/**
 * Parses free text into a clean, de-duplicated tag list.
 *
 * Accepts comma- or newline-separated input (plus `#` prefixes) so tags can be
 * typed naturally, then enforces the per-note cap.
 */
export function parseTags(raw: string): string[] {
  const parts = raw
    .split(/[,\n]/)
    .map((part) => normalizeTag(part.replace(/^#+/, '')))
    .filter((tag) => tag.length > 0);

  return [...new Set(parts)].slice(0, MAX_TAGS_PER_NOTE);
}

/** Renders a tag list back into an editable string. */
export function formatTags(tags: readonly string[]): string {
  return tags.join(', ');
}

/**
 * Fills in defaults for fields that older stored notes do not have.
 *
 * Returns `null` when the value is not a usable note at all, so corrupted
 * entries are dropped rather than crashing the list.
 */
export function normalizeNote(value: unknown): Note | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.body !== 'string' ||
    typeof candidate.createdAt !== 'number' ||
    typeof candidate.updatedAt !== 'number'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    body: candidate.body,
    // Added after v1 shipped, so older notes need these derived.
    tags: Array.isArray(candidate.tags)
      ? parseTags(candidate.tags.filter((tag) => typeof tag === 'string').join(','))
      : [],
    pinned: candidate.pinned === true,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

