import { Stack, ThemeProvider } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDarkTheme, AppLightTheme } from '@/constants/navigation-theme';
import { Colors } from '@/constants/theme';
import { NotesProvider } from '@/hooks/use-notes';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = isDark ? AppDarkTheme : AppLightTheme;
  const palette = isDark ? Colors.dark : Colors.light;

  /**
   * Paints the native root view the same colour as the app.
   *
   * Without this the Android root view stays white, so any moment the window
   * background is exposed — during a transition, or while a screen mounts —
   * flashes white. Running it here keeps it in step with the colour scheme.
   */
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  /**
   * Both screens paint this colour themselves, so sharing one object also gives
   * the navigator a matching background. Memoised because `screenOptions` is
   * compared by reference.
   */
  const screenOptions = useMemo(
    () => ({
      contentStyle: { backgroundColor: palette.background },
      // Without this the back button falls back to the route name ("index").
      headerBackTitle: 'Notes',
    }),
    [palette.background],
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <NotesProvider>
          <Stack screenOptions={screenOptions}>
            {/* The list renders its own title, so it needs no header. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="note/[id]" />
            <Stack.Screen name="tags" options={{ title: 'Manage tags' }} />
          </Stack>
        </NotesProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
