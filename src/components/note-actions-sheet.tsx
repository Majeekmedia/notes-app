import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NoteActionsSheetProps = {
  visible: boolean;
  /** Note title, shown so it is clear which note the actions apply to. */
  title: string;
  pinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
};

/**
 * Long-press action menu for a note.
 *
 * Built on React Native's `Modal` rather than `Alert`, because `Alert` is not
 * implemented on react-native-web — an Alert-based menu would simply do nothing
 * in the browser. `Modal` behaves consistently on iOS, Android and web, and
 * leaves room for more actions later.
 */
export function NoteActionsSheet({
  visible,
  title,
  pinned,
  onClose,
  onTogglePin,
  onDelete,
}: NoteActionsSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Android hardware back should close the sheet, not leave the screen.
      statusBarTranslucent>
      {/*
        The dismiss area is a SIBLING of the card, not its parent.
        Wrapping the card in a pressable backdrop rendered a `<button>` around
        the action buttons, which is invalid HTML on web and breaks hydration.
      */}
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close actions menu"
        />

        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {title}
          </ThemedText>

          <View style={styles.actions}>
            <ActionRow
              label={pinned ? 'Unpin note' : 'Pin note'}
              hint={pinned ? 'Move back into the normal order' : 'Keep this note at the top'}
              glyph={pinned ? '★' : '☆'}
              onPress={() => {
                onTogglePin();
                onClose();
              }}
            />

            <ActionRow
              label="Delete note"
              hint="Remove it from this device"
              glyph="🗑"
              destructive
              onPress={() => {
                onClose();
                onDelete();
              }}
            />
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type ActionRowProps = {
  label: string;
  hint: string;
  glyph: string;
  destructive?: boolean;
  onPress: () => void;
};

function ActionRow({ label, hint, glyph, destructive = false, onPress }: ActionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionRow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={styles.actionGlyph}>{glyph}</ThemedText>
      <View style={styles.actionText}>
        <ThemedText style={destructive ? styles.destructive : undefined}>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  scrim: {
    // Full-bleed dismiss layer sitting behind the card.
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  actionGlyph: {
    fontSize: 18,
    lineHeight: 24,
    width: 24,
    textAlign: 'center',
  },
  actionText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  destructive: {
    fontWeight: '600',
    color: '#E5484D',
  },
  cancel: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  cancelLabel: {
    fontWeight: '600',
  },
});
