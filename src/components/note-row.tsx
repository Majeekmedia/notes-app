import { Pressable, StyleSheet, View } from 'react-native';

import { TagChip } from '@/components/tag-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDate } from '@/lib/format';
import { noteDisplayTitle, notePreview, type Note } from '@/types/note';

type NoteRowProps = {
  note: Note;
  onPress: () => void;
  /** Opens the actions menu. Deliberately not "delete" — the menu offers pin too. */
  onLongPress: () => void;
  onTogglePin: () => void;
  /** Enters bulk selection with this note ticked. */
  onSelectToggle: () => void;
  /** Highlighted when a search term matched, so results are easy to scan. */
  highlighted?: boolean;
  /** True while the list is in bulk selection mode. */
  selecting?: boolean;
  /** True when this note is ticked in selection mode. */
  selected?: boolean;
};

/** How many tags fit on a row before the rest are summarised. */
const MAX_VISIBLE_TAGS = 3;

/** Width of the right-hand column holding the pin button. */
const PIN_RAIL_WIDTH = 56;

export function NoteRow({
  note,
  onPress,
  onLongPress,
  onTogglePin,
  onSelectToggle,
  highlighted = false,
  selecting = false,
  selected = false,
}: NoteRowProps) {
  const theme = useTheme();
  const preview = notePreview(note);
  const visibleTags = note.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = note.tags.length - visibleTags.length;

  return (
    /**
     * The pin control is a SIBLING of the row, not a child.
     *
     * Nesting it inside the row's `Pressable` produced two nested `<button>`
     * elements on web — invalid HTML that breaks hydration and gives screen
     * readers two overlapping focus targets. Keeping them siblings avoids this
     * while leaving the whole row tappable.
     */
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityState={selecting ? { selected } : undefined}
        accessibilityLabel={`Open note: ${noteDisplayTitle(note)}${
          note.pinned ? ', pinned' : ''
        }`}
        accessibilityHint={
          selecting ? 'Toggles selection' : 'Long press for pin and delete options'
        }
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
            opacity: pressed ? 0.65 : 1,
            // A subtle outline marks search matches without shifting the layout.
            borderColor: highlighted || selected ? theme.text : 'transparent',
          },
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

        {note.tags.length > 0 ? (
          <View style={styles.tags}>
            {visibleTags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
            {hiddenTagCount > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                +{hiddenTagCount}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {/* box-none lets taps pass through the rail everywhere except the button. */}
      <View style={styles.pinRail} pointerEvents="box-none">
        {selecting ? (
          <Pressable
            onPress={onPress}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select ${noteDisplayTitle(note)}`}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.checkbox,
              {
                borderColor: selected ? theme.text : theme.textSecondary,
                backgroundColor: selected ? theme.text : 'transparent',
                opacity: pressed ? 0.6 : 1,
              },
            ]}>
            {selected ? (
              <ThemedText style={[styles.checkGlyph, { color: theme.background }]}>✓</ThemedText>
            ) : null}
          </Pressable>
        ) : (
          <Pressable
            onPress={onTogglePin}
            accessibilityRole="button"
            accessibilityState={{ selected: note.pinned }}
            accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'}
            hitSlop={Spacing.two}
            style={({ pressed }) => [styles.pinButton, { opacity: pressed ? 0.5 : 1 }]}>
            <ThemedText style={[styles.pinGlyph, note.pinned ? styles.pinActive : undefined]}>
              {note.pinned ? '★' : '☆'}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    // Leaves room for the pin rail so the date never sits under the button.
    paddingRight: PIN_RAIL_WIDTH,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  pinRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: PIN_RAIL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButton: {
    padding: Spacing.two,
  },
  pinGlyph: {
    fontSize: 20,
    lineHeight: 24,
    color: '#9BA1A6',
  },
  pinActive: {
    color: '#F5A524',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
});
