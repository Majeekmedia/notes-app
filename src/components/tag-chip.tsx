import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TagChipProps = {
  label: string;
  /** When provided the chip is pressable, and `selected` styles the active state. */
  onPress?: () => void;
  selected?: boolean;
  /** Trailing count, shown in the filter bar. */
  count?: number;
  /**
   * Overrides the default spoken label. Needed because the same chip is used for
   * filtering the list and for adding a tag in the editor, and "Filter by x" is
   * wrong for the latter.
   */
  accessibilityLabel?: string;
};

/**
 * A single tag pill.
 *
 * Renders as a plain `View` when no `onPress` is given, so tags shown for
 * information on a note row are not announced as buttons by screen readers.
 */
export function TagChip({
  label,
  onPress,
  selected = false,
  count,
  accessibilityLabel,
}: TagChipProps) {
  const theme = useTheme();

  const content = (
    <ThemedText
      type="small"
      themeColor={selected ? 'background' : 'textSecondary'}
      style={styles.label}>
      {label}
      {count !== undefined ? ` ${count}` : ''}
    </ThemedText>
  );

  if (onPress === undefined) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.plain}>
        #{label}
      </ThemedText>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        accessibilityLabel ??
        (selected ? `Remove ${label} filter` : `Filter by ${label}`)
      }
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  label: {
    fontWeight: '600',
  },
  plain: {
    fontWeight: '500',
  },
});
