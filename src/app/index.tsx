import { Stack, router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteRow } from '@/components/note-row';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNotes } from '@/hooks/use-notes';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import type { Note } from '@/types/note';

export default function NotesListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { notes, isLoaded, createNote, deleteNote } = useNotes();

  /** New notes are created first, then immediately opened for editing. */
  const handleCreate = useCallback(() => {
    const note = createNote();
    router.push({ pathname: '/note/[id]', params: { id: note.id } });
  }, [createNote]);

  const handleDelete = useCallback(
    async (note: Note) => {
      const confirmed = await confirmDestructive(
        'Delete note?',
        'This note will be permanently removed from this device.',
      );
      if (confirmed) deleteNote(note.id);
    },
    [deleteNote],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle">Notes</ThemedText>
        {isLoaded && notes.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </ThemedText>
        ) : null}
      </View>

      {!isLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : notes.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.id } })}
              onDelete={() => void handleDelete(item)}
            />
          )}
        />
      )}

      <Pressable
        onPress={handleCreate}
        accessibilityRole="button"
        accessibilityLabel="Create a new note"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.text,
            bottom: insets.bottom + Spacing.four,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <ThemedText style={[styles.fabGlyph, { color: theme.background }]}>＋</ThemedText>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.centered}>
      <ThemedText type="subtitle" style={styles.centeredText}>
        No notes yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        Tap the ＋ button to write your first note.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  centeredText: {
    textAlign: 'center',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 140,
  },
  separator: {
    height: Spacing.two,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlyph: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
});
