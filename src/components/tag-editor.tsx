import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { TagChip } from '@/components/tag-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { suggestTags } from '@/lib/notes-query';
import { MAX_TAGS_PER_NOTE, normalizeTag, type Note } from '@/types/note';

type TagEditorProps = {
  /** The note's current tags. */
  tags: readonly string[];
  /** All notes, used as the source of tag suggestions. */
  allNotes: readonly Note[];
  onChange: (tags: string[]) => void;
};

/**
 * Tag editor with autocomplete.
 *
 * Replaces a plain comma-separated text field. Committing a tag with Enter (or
 * by tapping a suggestion) avoids the previous problem where a half-typed tag
 * was parsed on every keystroke and typos silently created new tags.
 */
export function TagEditor({ tags, allNotes, onChange }: TagEditorProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');

  const atLimit = tags.length >= MAX_TAGS_PER_NOTE;

  const suggestions = useMemo(
    () => (atLimit ? [] : suggestTags(allNotes, input, tags)),
    [allNotes, input, tags, atLimit],
  );

  const addTag = useCallback(
    (raw: string) => {
      const tag = normalizeTag(raw);
      setInput('');
      if (tag.length === 0 || tags.includes(tag) || tags.length >= MAX_TAGS_PER_NOTE) return;
      onChange([...tags, tag]);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => onChange(tags.filter((existing) => existing !== tag)),
    [tags, onChange],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          Tags
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tags.length}/{MAX_TAGS_PER_NOTE}
        </ThemedText>
      </View>

      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => removeTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}
              style={({ pressed }) => [
                styles.removable,
                { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
              ]}>
              <ThemedText type="small" style={styles.removableLabel}>
                #{tag}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.removeGlyph}>
                ✕
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        value={input}
        onChangeText={setInput}
        onSubmitEditing={() => addTag(input)}
        editable={!atLimit}
        placeholder={atLimit ? `Limit of ${MAX_TAGS_PER_NOTE} tags reached` : 'Add a tag, then press enter'}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        accessibilityLabel="Add a tag"
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <ThemedText type="small" themeColor="textSecondary">
            Suggestions
          </ThemedText>
          <View style={styles.chips}>
            {suggestions.map((tag) => (
              <TagChip key={tag} label={tag} onPress={() => addTag(tag)} accessibilityLabel={`Add tag ${tag}`} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  removable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  removableLabel: {
    fontWeight: '600',
  },
  removeGlyph: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  suggestions: {
    gap: Spacing.two,
  },
});
