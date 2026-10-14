import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

/** Search field with a clear button that appears only once there is text. */
export function SearchBar({ value, onChangeText, placeholder = 'Search notes' }: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.icon}>
        ⌕
      </ThemedText>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel="Search notes"
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={Spacing.two}
          style={styles.clear}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.clearGlyph}>
            ✕
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    minHeight: 40,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    // Keeps the field height identical on iOS and Android.
    paddingVertical: Spacing.two,
  },
  clear: {
    padding: Spacing.half,
  },
  clearGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
});
