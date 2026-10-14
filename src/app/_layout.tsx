import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotesProvider } from '@/hooks/use-notes';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaProvider>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <NotesProvider>
          <Stack screenOptions={{ headerBackTitle: 'Notes' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
          </Stack>
        </NotesProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
