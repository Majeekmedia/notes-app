/**
 * Pure query helpers for the notes list.
 *
 * Kept out of the components so the search, filter and sort rules are stated in
 * one place and can be reasoned about (and tested) without rendering anything.
 */
import { noteDisplayTitle, type Note } from '@/types/note';

export type SortOrder = 'updated' | 'created' | 'title';

export type NoteQuery = {
  /** Free text matched against title, body and tags. Blank means no filtering. */
  search: string;
  /** When set, only notes carrying this tag are returned. */
  tag: string | null;
  sort: SortOrder;
};

export const DEFAULT_QUERY: NoteQuery = { search: '', tag: null, sort: 'updated' };

/**
 * Matches a note against a search term.
 *
 * Searches tags as well as title and body, so "work" finds a note tagged `work`
 * even when the word never appears in its text.
 */
function matchesSearch(note: Note, term: string): boolean {
  if (term.length === 0) return true;

  return (
    note.title.toLowerCase().includes(term) ||
    note.body.toLowerCase().includes(term) ||
    note.tags.some((tag) => tag.includes(term))
  );
}

/** Applies search + tag filtering, then orders the result. */
export function queryNotes(notes: readonly Note[], query: NoteQuery): Note[] {
  const term = query.search.trim().toLowerCase();

  const filtered = notes.filter(
    (note) =>
      matchesSearch(note, term) &&
      (query.tag === null || note.tags.includes(query.tag)),
  );

  return sortNotes(filtered, query.sort);
}

/**
 * Orders notes, always keeping pinned notes above unpinned ones.
 *
 * The pinned/unpinned split is applied on top of the chosen sort rather than
 * being one of the options, because pinning should stay meaningful whatever
 * order the user picks.
 */
export function sortNotes(notes: readonly Note[], sort: SortOrder): Note[] {
  const compare = (a: Note, b: Note): number => {
    switch (sort) {
      case 'created':
        return b.createdAt - a.createdAt;
      case 'title':
        return noteDisplayTitle(a).localeCompare(noteDisplayTitle(b), undefined, {
          sensitivity: 'base',
        });
      case 'updated':
      default:
        return b.updatedAt - a.updatedAt;
    }
  };

  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return compare(a, b);
  });
}

/** Counts notes per tag, most used first, for the filter bar. */
export function collectTagCounts(notes: readonly Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** All distinct tags in use, alphabetically. */
export function allTags(notes: readonly Note[]): string[] {
  const tags = new Set<string>();
  for (const note of notes) {
    for (const tag of note.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * Suggestions for a partially typed tag.
 *
 * Matches anywhere in the tag (not just the start) so "sh" finds both `shopping`
 * and `fresh`. Already-selected tags and the exact current input are excluded,
 * so the list only ever offers something new. Most-used tags come first.
 */
export function suggestTags(
  notes: readonly Note[],
  input: string,
  exclude: readonly string[] = [],
  limit = 6,
): string[] {
  const term = input.trim().toLowerCase();
  const taken = new Set(exclude);

  return collectTagCounts(notes)
    .map((entry) => entry.tag)
    .filter((tag) => !taken.has(tag))
    .filter((tag) => (term.length === 0 ? true : tag.includes(term)))
    .filter((tag) => tag !== term)
    .slice(0, limit);
}
