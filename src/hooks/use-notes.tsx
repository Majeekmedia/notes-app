/**
 * Single source of truth for notes, shared across screens.
 *
 * Why a provider and not one hook per screen: the list screen and the editor
 * screen both mutate the same collection, and the editor is reached by pushing a
 * new route. Raising the state above the navigator keeps both screens in sync
 * without prop drilling or a heavier state library.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { loadNotes, saveNotes } from '@/lib/storage';
import { sortNotes } from '@/lib/notes-query';
import { MAX_TAGS_PER_NOTE, createEmptyNote, normalizeTag, type Note } from '@/types/note';

/** The fields the editor is allowed to change. */
export type NotePatch = Pick<Note, 'title' | 'body' | 'tags'>;

type NotesContextValue = {
  /** Newest edit first. */
  notes: Note[];
  /** False until the first read from storage finishes. */
  isLoaded: boolean;
  getNote: (id: string) => Note | undefined;
  /** Creates a note, persists it, and returns it so the caller can navigate to it. */
  createNote: () => Note;
  updateNote: (id: string, patch: NotePatch) => void;
  deleteNote: (id: string) => void;
  /** Flips a note's pinned state. Pinned notes sort above the rest. */
  togglePin: (id: string) => void;
  /** Deletes several notes at once, for bulk selection. */
  deleteNotes: (ids: readonly string[]) => void;
  /** Sets the pinned state for several notes at once. */
  setPinnedFor: (ids: readonly string[], pinned: boolean) => void;
  /** Adds a tag to several notes at once, skipping notes that already have it. */
  addTagTo: (ids: readonly string[], tag: string) => void;
  /** Removes a tag from several notes at once. */
  removeTagFrom: (ids: readonly string[], tag: string) => void;
  /** Renames a tag across every note that uses it. */
  renameTag: (from: string, to: string) => void;
  /** Removes a tag from every note that uses it. */
  deleteTag: (tag: string) => void;
};

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Mirrors `notes` so the mutation callbacks can read the latest list without
   * being re-created on every change. Only ever read inside event handlers.
   */
  const notesRef = useRef<Note[]>([]);

  /** Replaces the list and writes it through to storage in one step. */
  const replaceAll = useCallback((next: Note[]) => {
    notesRef.current = next;
    setNotes(next);
    void saveNotes(next);
  }, []);

  // Initial read. `cancelled` guards against a state update after unmount.
  useEffect(() => {
    let cancelled = false;

    void loadNotes().then((stored) => {
      if (cancelled) return;
      notesRef.current = stored;
      setNotes(stored);
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const createNote = useCallback((): Note => {
    const note = createEmptyNote();
    replaceAll([note, ...notesRef.current]);
    return note;
  }, [replaceAll]);

  const updateNote = useCallback(
    (id: string, patch: NotePatch) => {
      const now = Date.now();
      replaceAll(
        notesRef.current.map((note) =>
          note.id === id ? { ...note, ...patch, updatedAt: now } : note,
        ),
      );
    },
    [replaceAll],
  );

  const deleteNote = useCallback(
    (id: string) => {
      replaceAll(notesRef.current.filter((note) => note.id !== id));
    },
    [replaceAll],
  );

  /**
   * Flips the pinned flag.
   *
   * `updatedAt` is deliberately left alone: pinning is not an edit, and touching
   * it would make a pinned note claim it was "just edited" and reorder the list.
   */
  const togglePin = useCallback(
    (id: string) => {
      replaceAll(
        notesRef.current.map((note) =>
          note.id === id ? { ...note, pinned: !note.pinned } : note,
        ),
      );
    },
    [replaceAll],
  );

  /** Deletes several notes in one write, so storage is touched once. */
  const deleteNotes = useCallback(
    (ids: readonly string[]) => {
      const doomed = new Set(ids);
      replaceAll(notesRef.current.filter((note) => !doomed.has(note.id)));
    },
    [replaceAll],
  );

  /**
   * Bulk pin/unpin.
   *
   * Like `togglePin`, this deliberately does not touch `updatedAt`, and notes
   * whose state already matches are left untouched so no needless write happens.
   */
  const setPinnedFor = useCallback(
    (ids: readonly string[], pinned: boolean) => {
      const targets = new Set(ids);
      replaceAll(
        notesRef.current.map((note) =>
          targets.has(note.id) && note.pinned !== pinned ? { ...note, pinned } : note,
        ),
      );
    },
    [replaceAll],
  );

  /** Adds a tag to several notes, skipping any that already carry it. */
  const addTagTo = useCallback(
    (ids: readonly string[], rawTag: string) => {
      const tag = normalizeTag(rawTag);
      if (tag.length === 0) return;

      const targets = new Set(ids);
      const now = Date.now();

      replaceAll(
        notesRef.current.map((note) => {
          if (!targets.has(note.id) || note.tags.includes(tag)) return note;
          return {
            ...note,
            tags: [...note.tags, tag].slice(0, MAX_TAGS_PER_NOTE),
            updatedAt: now,
          };
        }),
      );
    },
    [replaceAll],
  );

  /** Removes a tag from several notes. */
  const removeTagFrom = useCallback(
    (ids: readonly string[], tag: string) => {
      const targets = new Set(ids);
      const now = Date.now();

      replaceAll(
        notesRef.current.map((note) => {
          if (!targets.has(note.id) || !note.tags.includes(tag)) return note;
          return { ...note, tags: note.tags.filter((t) => t !== tag), updatedAt: now };
        }),
      );
    },
    [replaceAll],
  );

  /**
   * Renames a tag everywhere it appears.
   *
   * If the target name already exists on a note, the tags are merged rather than
   * duplicated, so a rename can never produce two identical tags on one note.
   */
  const renameTag = useCallback(
    (from: string, rawTo: string) => {
      const to = normalizeTag(rawTo);
      if (to.length === 0 || to === from) return;

      const now = Date.now();

      replaceAll(
        notesRef.current.map((note) => {
          if (!note.tags.includes(from)) return note;

          const merged = [...new Set(note.tags.map((t) => (t === from ? to : t)))];
          return { ...note, tags: merged, updatedAt: now };
        }),
      );
    },
    [replaceAll],
  );

  /** Removes a tag from every note that uses it. */
  const deleteTag = useCallback(
    (tag: string) => {
      const now = Date.now();

      replaceAll(
        notesRef.current.map((note) =>
          note.tags.includes(tag)
            ? { ...note, tags: note.tags.filter((t) => t !== tag), updatedAt: now }
            : note,
        ),
      );
    },
    [replaceAll],
  );

  const getNote = useCallback(
    (id: string) => notes.find((note) => note.id === id),
    [notes],
  );

  // Default ordering, so callers that do not query still get sensible order.
  const orderedNotes = useMemo(() => sortNotes(notes, 'updated'), [notes]);

  const value = useMemo<NotesContextValue>(
    () => ({
      notes: orderedNotes,
      isLoaded,
      getNote,
      createNote,
      updateNote,
      deleteNote,
      togglePin,
      deleteNotes,
      setPinnedFor,
      addTagTo,
      removeTagFrom,
      renameTag,
      deleteTag,
    }),
    [
      orderedNotes,
      isLoaded,
      getNote,
      createNote,
      updateNote,
      deleteNote,
      togglePin,
      deleteNotes,
      setPinnedFor,
      addTagTo,
      removeTagFrom,
      renameTag,
      deleteTag,
    ],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);
  if (context === null) {
    throw new Error('useNotes must be used inside a <NotesProvider>.');
  }
  return context;
}
