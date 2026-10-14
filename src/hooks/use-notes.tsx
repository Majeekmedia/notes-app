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
import { createEmptyNote, type Note } from '@/types/note';

/** The only fields the editor is allowed to change. */
export type NotePatch = Pick<Note, 'title' | 'body'>;

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

  const getNote = useCallback(
    (id: string) => notes.find((note) => note.id === id),
    [notes],
  );

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );

  const value = useMemo<NotesContextValue>(
    () => ({ notes: sortedNotes, isLoaded, getNote, createNote, updateNote, deleteNote }),
    [sortedNotes, isLoaded, getNote, createNote, updateNote, deleteNote],
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
