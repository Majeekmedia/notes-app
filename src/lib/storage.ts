/**
 * Thin persistence layer over AsyncStorage.
 *
 * AsyncStorage is bundled inside Expo Go, so this keeps the free QR-code
 * workflow working. MMKV would require a custom development build.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NOTE_STORAGE_KEY, normalizeNote, type Note } from '@/types/note';

/**
 * Reads all notes. Never throws: a storage failure returns an empty list so the
 * UI can still render (an unreadable cache should not brick the app).
 *
 * Notes are normalised on read, which back-fills fields added after the first
 * release (`tags`, `pinned`) and drops entries that are not usable notes.
 */
export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTE_STORAGE_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const notes = parsed
      .map(normalizeNote)
      .filter((note): note is Note => note !== null);

    // Write the upgraded shape straight back, so a legacy note is only migrated
    // once rather than on every launch. Best-effort: a failure here is harmless.
    if (notes.length !== parsed.length || needsUpgrade(parsed)) {
      await saveNotes(notes);
    }

    return notes;
  } catch (error) {
    console.warn('[notes] could not read saved notes', error);
    return [];
  }
}

/** True when any raw entry is missing a field the current shape expects. */
function needsUpgrade(raw: readonly unknown[]): boolean {
  return raw.some((entry) => {
    if (typeof entry !== 'object' || entry === null) return true;
    const candidate = entry as Record<string, unknown>;
    return !Array.isArray(candidate.tags) || typeof candidate.pinned !== 'boolean';
  });
}


/** Persists the full list, replacing whatever was stored before. */
export async function saveNotes(notes: readonly Note[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn('[notes] could not save notes', error);
  }
}
