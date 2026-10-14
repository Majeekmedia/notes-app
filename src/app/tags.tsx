import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNotes } from '@/hooks/use-notes';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { collectTagCounts } from '@/lib/notes-query';

/**
 * Tag management: rename a tag everywhere, or delete it everywhere.
 *
 * Without this, a typo like `wrk` is permanent — there was no way to fix it
 * across the notes that carry it.
 */
export default function TagsScreen() {
  const theme = useTheme();
  const { notes, isLoaded, renameTag, deleteTag } = useNotes();

  /** Tag currently being renamed, and the in-progress replacement text. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const tagCounts = useMemo(() => collectTagCounts(notes), [notes]);
  const totalUses = useMemo(
    () => tagCounts.reduce((sum, entry) => sum + entry.count, 0),
    [tagCounts],
  );

  const startRename = useCallback((tag: string) => {
    setEditing(tag);
    setDraft(tag);
  }, []);

  const commitRename = useCallback(() => {
    if (editing === null) return;
    renameTag(editing, draft);
    setEditing(null);
    setDraft('');
  }, [editing, draft, renameTag]);

  const confirmDelete = useCallback(
    async (tag: string, count: number) => {
      const confirmed = await confirmDestructive(
        `Delete tag "#${tag}"?`,
        `It will be removed from ${count} ${count === 1 ? 'note' : 'notes'}. The notes themselves are kept.`,
      );
      if (confirmed) deleteTag(tag);
    },
    [deleteTag],
  );

  if (!isLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Manage tags' }} />
        <ThemedText themeColor="textSecondary">Loading…</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Manage tags' }} />

      {tagCounts.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No tags yet
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            Add tags while editing a note and they will appear here.
          </ThemedText>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={Spacing.two}>
            <ThemedText type="link">Go back</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tagCounts}
          keyExtractor={(entry) => entry.tag}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
              {tagCounts.length} {tagCounts.length === 1 ? 'tag' : 'tags'} · {totalUses}{' '}
              {totalUses === 1 ? 'use' : 'uses'} across {notes.length}{' '}
              {notes.length === 1 ? 'note' : 'notes'}
            </ThemedText>
          }
          renderItem={({ item }) => {
            const isEditing = editing === item.tag;

            return (
              <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                {isEditing ? (
                  <>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={commitRename}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.renameInput,
                        { color: theme.text, backgroundColor: theme.background },
                      ]}
                      accessibilityLabel={`New name for tag ${item.tag}`}
                    />
                    <View style={styles.actions}>
                      <Pressable
                        onPress={commitRename}
                        accessibilityRole="button"
                        accessibilityLabel="Save tag name"
                        hitSlop={Spacing.two}>
                        <ThemedText type="link" style={styles.save}>
                          Save
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditing(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel rename"
                        hitSlop={Spacing.two}>
                        <ThemedText type="link" themeColor="textSecondary">
                          Cancel
                        </ThemedText>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.label}>
                      <ThemedText style={styles.tagName}>#{item.tag}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.count} {item.count === 1 ? 'note' : 'notes'}
                      </ThemedText>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => startRename(item.tag)}
                        accessibilityRole="button"
                        accessibilityLabel={`Rename tag ${item.tag}`}
                        hitSlop={Spacing.two}>
                        <ThemedText type="link">Rename</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => void confirmDelete(item.tag, item.count)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete tag ${item.tag}`}
                        hitSlop={Spacing.two}>
                        <ThemedText type="link" style={styles.destructive}>
                          Delete
                        </ThemedText>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  centeredText: {
    textAlign: 'center',
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
  summary: {
    paddingBottom: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  label: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  tagName: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  renameInput: {
    flex: 1,
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  save: {
    fontWeight: '700',
  },
  destructive: {
    color: '#E5484D',
    fontWeight: '600',
  },
});
