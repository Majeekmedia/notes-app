import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TagChip } from '@/components/tag-chip';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNotes } from '@/hooks/use-notes';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { formatTags, parseTags, type Note } from '@/types/note';

/** Debounce before writing to storage, so typing does not thrash AsyncStorage. */
const SAVE_DELAY_MS = 400;

/**
 * Route wrapper: resolves the `:id` param and handles the loading / not-found
 * states, so the editor below can assume it always has a real note.
 */
export default function NoteEditorRoute() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoaded, getNote } = useNotes();
  const note = getNote(id);

  if (!isLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Note' }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText type="subtitle">Note not found</ThemedText>
        <ThemedText themeColor="textSecondary">It may have been deleted.</ThemedText>
        <Pressable onPress={() => router.replace('/')} style={styles.linkButton}>
          <ThemedText type="link" themeColor="textSecondary">
            Back to notes
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  // Keyed so switching notes remounts the editor with fresh draft state.
  return <NoteEditor key={note.id} note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const theme = useTheme();
  const { updateNote, deleteNote, togglePin } = useNotes();

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  /** Tags are held as raw text while editing so partial words are not parsed away. */
  const [tagsText, setTagsText] = useState(formatTags(note.tags));
  const [pinned, setPinned] = useState(note.pinned);

  /**
   * Latest draft, kept in a ref so the debounced save and the unmount flush
   * always read current values instead of a stale closure.
   */
  const draft = useRef({
    title,
    body,
    tags: parseTags(tagsText),
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    updateNote(note.id, draft.current);
  }, [note.id, updateNote]);

  // Autosave, debounced while the user types.
  useEffect(() => {
    draft.current = { title, body, tags: parseTags(tagsText) };

    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);

    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [title, body, tagsText, flush]);

  // Flush any pending edit when the screen unmounts.
  useEffect(() => flush, [flush]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDestructive(
      'Delete note?',
      'This note will be permanently removed from this device.',
    );
    if (!confirmed) return;

    // Cancel the pending autosave first, or it could re-add the deleted note.
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    deleteNote(note.id);
    router.back();
  }, [note.id, deleteNote]);

  /**
   * Pinning is applied immediately rather than through the debounce, because it
   * is a deliberate action and the star should respond at once.
   */
  const handleTogglePin = useCallback(() => {
    setPinned((current) => !current);
    togglePin(note.id);
  }, [note.id, togglePin]);

  const displayTitle = title.trim().length > 0 ? title.trim() : 'Note';
  const parsedTags = parseTags(tagsText);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: displayTitle,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleTogglePin}
                accessibilityRole="button"
                accessibilityState={{ selected: pinned }}
                accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
                hitSlop={Spacing.two}>
                <ThemedText
                  type="link"
                  style={[styles.headerAction, pinned ? styles.pinActive : undefined]}>
                  {pinned ? '★ Pinned' : '☆ Pin'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => void handleDelete()}
                accessibilityRole="button"
                accessibilityLabel="Delete this note"
                hitSlop={Spacing.two}>
                <ThemedText type="link" style={styles.headerAction}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={theme.textSecondary}
            style={[styles.titleInput, { color: theme.text }]}
            returnKeyType="next"
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Start writing…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.bodyInput, { color: theme.text }]}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />

          <View style={styles.tagSection}>
            <ThemedText type="small" themeColor="textSecondary">
              Tags
            </ThemedText>
            <TextInput
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="work, ideas, urgent"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.tagInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Tags, separated by commas"
            />

            {parsedTags.length > 0 ? (
              <View style={styles.tagPreview}>
                {parsedTags.map((tag) => (
                  <TagChip key={tag} label={tag} />
                ))}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Separate tags with commas.
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          Saved automatically on this device
        </ThemedText>
      </View>
    </KeyboardAvoidingView>
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
  linkButton: {
    paddingVertical: Spacing.two,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: Spacing.two,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 240,
    paddingVertical: Spacing.two,
  },
  tagSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  tagInput: {
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerAction: {
    fontWeight: '600',
  },
  pinActive: {
    color: '#F5A524',
  },
});
