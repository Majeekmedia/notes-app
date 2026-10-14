/**
 * Navigation themes aligned with the app's own palette.
 *
 * Why this file exists:
 * Expo Router's built-in themes carry their own colours (light background
 * `rgb(242, 242, 242)`, dark header `rgb(18, 18, 18)`). The navigator paints
 * those colours *behind and around* our screens, so whenever they differ from
 * the screen's own background you see a flicker on every push and pop — most
 * obviously a grey header against a black screen in dark mode.
 *
 * Mapping them onto `Colors` removes the mismatch entirely, so transitions are
 * seamless. See Expo's docs, Stack → "White background flashes when navigating".
 */
import { DarkTheme, DefaultTheme } from 'expo-router';

import { Colors } from '@/constants/theme';

type NavigationTheme = typeof DefaultTheme;

export const AppLightTheme: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    // `card` paints the header, so matching it to the screen background keeps
    // the header seamlessly connected to the content below it.
    card: Colors.light.background,
    text: Colors.light.text,
    // Used for the header hairline, dividing it from the content.
    border: Colors.light.backgroundElement,
  },
};

export const AppDarkTheme: NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundElement,
  },
};
