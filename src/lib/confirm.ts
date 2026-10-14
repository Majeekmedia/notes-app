/**
 * Cross-platform destructive-action confirmation.
 *
 * React Native's `Alert` is not implemented on react-native-web, so the web
 * branch falls back to the browser's native confirm dialog.
 */
import { Alert, Platform } from 'react-native';

export function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
