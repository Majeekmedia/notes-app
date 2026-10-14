import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteActionsSheet } from '@/components/note-actions-sheet';
import { NoteRow } from '@/components/note-row';
import { SearchBar } from '@/components/search-bar';
import { TagChip } from '@/components/tag-chip';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNotes } from '@/hooks/use-notes';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { collectTagCounts, queryNotes, type SortOrder } from '@/lib/notes-query';
import { noteDisplayTitle, type Note } from '@/types/note';

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: 'updated', label: 'Edited' },
  { key: 'created', label: 'Created' },
  { key: 'title', label: 'Title' },
];

export default function NotesListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { notes, isLoaded, createNote, deleteNote, togglePin } = useNotes();

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>('updated');
  /** Note whose long-press action menu is open, if any. */
  const [actionsNote, setActionsNote] = useState<Note | null>(null);

  const visibleNotes = useMemo(
    () => queryNotes(notes, { search, tag: activeTag, sort }),
    [notes, search, activeTag, sort],
  );

  /**
   * Keeps the open menu in step with the store.
   *
   * The sheet holds a Note object, so after a pin/delete the copy it captured
   * would be stale. Re-reading by id means the menu always reflects reality.
   */
  const menuNote = useMemo(
    () => (actionsNote ? (notes.find((note) => note.id === actionsNote.id) ?? null) : null),
    [actionsNote, notes],
  );

  const tagCounts = useMemo(() => collectTagCounts(notes), [notes]);

  /** True when a search or tag filter is narrowing the list. */
  const isFiltering = search.trim().length > 0 || activeTag !== null;

  /**
   * Creates a note, then opens it.
   *
   * Both the state update and the navigation happen in the same event handler,
   * so React batches them into a single render — the list never paints an
   * intermediate "note added" frame before the editor starts sliding in.
   */
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

  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveTag(null);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle">Majeek Notes</ThemedText>
        {isLoaded && notes.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {describeCount(visibleNotes.length, notes.length, isFiltering)}
          </ThemedText>
        ) : null}
      </View>

      {isLoaded && notes.length > 0 ? (
        <View style={styles.controls}>
          <SearchBar value={search} onChangeText={setSearch} />

          {tagCounts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRow}
              keyboardShouldPersistTaps="handled">
              {tagCounts.map(({ tag, count }) => (
                <TagChip
                  key={tag}
                  label={tag}
                  count={count}
                  selected={activeTag === tag}
                  onPress={() => setActiveTag((current) => (current === tag ? null : tag))}
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.sortRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Sort
            </ThemedText>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setSort(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === option.key }}
                accessibilityLabel={`Sort by ${option.label}`}
                hitSlop={Spacing.two}>
                <ThemedText
                  type="small"
                  themeColor={sort === option.key ? 'text' : 'textSecondary'}
                  style={sort === option.key ? styles.sortActive : undefined}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* The long-press menu is the only way to reach pin in a list, so say so. */}
          <ThemedText type="small" themeColor="textSecondary">
            Tap ☆ to pin · long press a note for more options
          </ThemedText>
        </View>
      ) : null}

      {!isLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : notes.length === 0 ? (
        <EmptyState />
      ) : visibleNotes.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <FlatList
          data={visibleNotes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              highlighted={search.trim().length > 0}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.id } })}
              onLongPress={() => setActionsNote(item)}
              onTogglePin={() => togglePin(item.id)}
            />
          )}
        />
      )}

      <NoteActionsSheet
        visible={menuNote !== null}
        title={menuNote ? noteDisplayTitle(menuNote) : ''}
        pinned={menuNote?.pinned ?? false}
        onClose={() => setActionsNote(null)}
        onTogglePin={() => {
          if (menuNote) togglePin(menuNote.id);
        }}
        onDelete={() => {
          if (menuNote) void handleDelete(menuNote);
        }}
      />

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

function describeCount(visible: number, total: number, isFiltering: boolean): string {
  if (!isFiltering) return `${total} ${total === 1 ? 'note' : 'notes'}`;
  return `${visible} of ${total} ${total === 1 ? 'note' : 'notes'}`;
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

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <View style={styles.centered}>
      <ThemedText type="subtitle" style={styles.centeredText}>
        No matching notes
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        Try a different search or tag.
      </ThemedText>
      <Pressable onPress={onClear} accessibilityRole="button" hitSlop={Spacing.two}>
        <ThemedText type="link">Clear filters</ThemedText>
      </Pressable>
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
  controls: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  tagRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  sortActive: {
    fontWeight: '700',
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
