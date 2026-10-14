import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDate } from '@/lib/format';
import { noteDisplayTitle, notePreview, type Note } from '@/types/note';

type NoteRowProps = {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
};

export function NoteRow({ note, onPress, onDelete }: NoteRowProps) {
  const theme = useTheme();
  const preview = notePreview(note);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`Open note: ${noteDisplayTitle(note)}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.65 : 1 },
      ]}>
      <View style={styles.header}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {noteDisplayTitle(note)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeDate(note.updatedAt)}
        </ThemedText>
      </View>

      {preview.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {preview}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.italic}>
          No additional text
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
    fontWeight: '600',
  },
  italic: {
    fontStyle: 'italic',
  },
});
