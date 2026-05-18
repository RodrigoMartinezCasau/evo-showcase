import { Alert } from 'react-native';

export const OUT_OF_USES_ALERT_MESSAGE = 'Te has quedado sin usos';

export function showOutOfUsesAlert(): void {
  Alert.alert(OUT_OF_USES_ALERT_MESSAGE);
}
