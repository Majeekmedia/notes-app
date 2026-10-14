/**
 * Thin persistence layer over AsyncStorage.
 *
 * AsyncStorage is bundled inside Expo Go, so this keeps the free QR-code
 * workflow working. MMKV would require a custom development build.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NOTE_STORAGE_KEY, isNote, type Note } from '@/types/note';

/**
 * Reads all notes. Never throws: a storage failure returns an empty list so the
 * UI can still render (an unreadable cache should not brick the app).
 */
export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTE_STORAGE_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Drop anything that does not match the current shape rather than crashing.
    return parsed.filter(isNote);
  } catch (error) {
    console.warn('[notes] could not read saved notes', error);
    return [];
  }
}

/** Persists the full list, replacing whatever was stored before. */
export async function saveNotes(notes: readonly Note[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn('[notes] could not save notes', error);
  }
}
