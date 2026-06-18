import { Audio } from 'expo-av';
import { Alert, Linking } from 'react-native';

/**
 * Requests microphone access in an App Store-compliant way (Guideline 5.1.1).
 *
 * - Shows the OS permission prompt only the first time (when it can still be asked).
 * - If the user denies, we respect that decision and do NOT ask them to reconsider.
 * - If permission is permanently denied, we show a single neutral notice that the
 *   feature needs the microphone and offer a link to Settings (allowed by Apple).
 *
 * Returns true only when microphone access is granted.
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  try {
    const current = await Audio.getPermissionsAsync();
    if (current.granted) {
      return true;
    }

    // First-time / still askable: show the system prompt once.
    if (current.canAskAgain) {
      const requested = await Audio.requestPermissionsAsync();
      return requested.granted;
    }

    // Permanently denied: inform once and offer Settings. No "reconsider" wording.
    Alert.alert(
      'Microphone is off',
      'To use voice features, turn on microphone access for Spanish Lab in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  } catch (error) {
    console.error('Microphone permission error:', error);
    return false;
  }
}
