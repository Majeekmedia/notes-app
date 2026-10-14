import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
import { noteDisplayTitle, normalizeTag, type Note } from '@/types/note';

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: 'updated', label: 'Edited' },
  { key: 'created', label: 'Created' },
  { key: 'title', label: 'Title' },
];

export default function NotesListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    notes,
    isLoaded,
    createNote,
    deleteNote,
    togglePin,
    deleteNotes,
    setPinnedFor,
    addTagTo,
  } = useNotes();

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>('updated');
  /** Note whose long-press action menu is open, if any. */
  const [actionsNote, setActionsNote] = useState<Note | null>(null);

  /** Bulk selection mode. `null` means off; a Set means on with that selection. */
  const [selected, setSelected] = useState<Set<string> | null>(null);
  /** Tag being applied to the current selection. */
  const [bulkTag, setBulkTag] = useState('');

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

  const isSelecting = selected !== null;
  const selectedIds = useMemo(() => (selected ? [...selected] : []), [selected]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Enters selection mode with one note already ticked. */
  const startSelecting = useCallback((id: string) => {
    setSelected(new Set([id]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelected(null);
    setBulkTag('');
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(visibleNotes.map((note) => note.id)));
  }, [visibleNotes]);

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

  const handleBulkDelete = useCallback(async () => {
    const count = selectedIds.length;
    if (count === 0) return;

    const confirmed = await confirmDestructive(
      `Delete ${count} ${count === 1 ? 'note' : 'notes'}?`,
      `They will be permanently removed from this device.`,
    );
    if (!confirmed) return;

    deleteNotes(selectedIds);
    exitSelection();
  }, [selectedIds, deleteNotes, exitSelection]);

  const handleBulkPin = useCallback(
    (pinned: boolean) => {
      setPinnedFor(selectedIds, pinned);
      exitSelection();
    },
    [selectedIds, setPinnedFor, exitSelection],
  );

  const handleBulkAddTag = useCallback(() => {
    const tag = normalizeTag(bulkTag);
    if (tag.length === 0) return;

    addTagTo(selectedIds, tag);
    exitSelection();
  }, [bulkTag, selectedIds, addTagTo, exitSelection]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.titleRow}>
          {isSelecting ? (
            <ThemedText type="subtitle">
              {selected.size} selected
            </ThemedText>
          ) : (
            <ThemedText type="subtitle">Majeek Notes</ThemedText>
          )}

          <View style={styles.headerActions}>
            {isSelecting ? (
              <>
                <Pressable
                  onPress={selectAllVisible}
                  accessibilityRole="button"
                  accessibilityLabel="Select all visible notes"
                  hitSlop={Spacing.two}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.headerAction}>
                    All
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={exitSelection}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel selection"
                  hitSlop={Spacing.two}>
                  <ThemedText type="small" style={styles.headerAction}>
                    Cancel
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => router.push('/tags')}
                  accessibilityRole="button"
                  accessibilityLabel="Manage tags"
                  hitSlop={Spacing.two}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.headerAction}>
                    Tags
                  </ThemedText>
                </Pressable>
                {notes.length > 0 ? (
                  <Pressable
                    onPress={() => setSelected(new Set())}
                    accessibilityRole="button"
                    accessibilityLabel="Select notes"
                    hitSlop={Spacing.two}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.headerAction}>
                      Select
                    </ThemedText>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>

        {isLoaded && notes.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {isSelecting
              ? 'Tap notes to select · long press to open actions'
              : describeCount(visibleNotes.length, notes.length, isFiltering)}
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
          {!isSelecting ? (
            <ThemedText type="small" themeColor="textSecondary">
              Tap ☆ to pin · long press a note for more options
            </ThemedText>
          ) : null}
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
              selecting={isSelecting}
              selected={selected?.has(item.id) ?? false}
              onPress={() => {
                if (isSelecting) toggleSelected(item.id);
                else router.push({ pathname: '/note/[id]', params: { id: item.id } });
              }}
              onLongPress={() => {
                // While selecting, long press just toggles instead of opening the menu.
                if (isSelecting) toggleSelected(item.id);
                else setActionsNote(item);
              }}
              onTogglePin={() => togglePin(item.id)}
              onSelectToggle={() => startSelecting(item.id)}
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

      {/* Bulk action bar replaces the FAB while selecting, so the two never overlap. */}
      {isSelecting ? (
        <View
          style={[
            styles.bulkBar,
            {
              backgroundColor: theme.backgroundElement,
              paddingBottom: insets.bottom + Spacing.two,
            },
          ]}>
          <View style={styles.bulkRow}>
            <Pressable
              onPress={() => handleBulkPin(true)}
              disabled={selected.size === 0}
              accessibilityRole="button"
              accessibilityLabel="Pin selected notes"
              style={({ pressed }) => [
                styles.bulkButton,
                { backgroundColor: theme.background, opacity: selected.size === 0 ? 0.4 : pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="small" style={styles.bulkLabel}>
                ★ Pin
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => handleBulkPin(false)}
              disabled={selected.size === 0}
              accessibilityRole="button"
              accessibilityLabel="Unpin selected notes"
              style={({ pressed }) => [
                styles.bulkButton,
                { backgroundColor: theme.background, opacity: selected.size === 0 ? 0.4 : pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="small" style={styles.bulkLabel}>
                ☆ Unpin
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => void handleBulkDelete()}
              disabled={selected.size === 0}
              accessibilityRole="button"
              accessibilityLabel="Delete selected notes"
              style={({ pressed }) => [
                styles.bulkButton,
                { backgroundColor: theme.background, opacity: selected.size === 0 ? 0.4 : pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="small" style={[styles.bulkLabel, styles.destructive]}>
                Delete
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.bulkRow}>
            <TextInput
              value={bulkTag}
              onChangeText={setBulkTag}
              onSubmitEditing={handleBulkAddTag}
              placeholder="Add a tag to selection"
              placeholderTextColor={theme.textSecondary}
              editable={selected.size > 0}
              style={[styles.bulkInput, { color: theme.text, backgroundColor: theme.background }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Tag to add to selected notes"
            />
            <Pressable
              onPress={handleBulkAddTag}
              disabled={selected.size === 0 || bulkTag.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="Apply tag to selected notes"
              style={({ pressed }) => [
                styles.bulkButton,
                {
                  backgroundColor: theme.text,
                  opacity: selected.size === 0 || bulkTag.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="small" style={[styles.bulkLabel, { color: theme.background }]}>
                Apply
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
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
      )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerAction: {
    fontWeight: '600',
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bulkButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
  },
  bulkLabel: {
    fontWeight: '600',
  },
  bulkInput: {
    flex: 2,
    fontSize: 15,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  destructive: {
    color: '#E5484D',
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
