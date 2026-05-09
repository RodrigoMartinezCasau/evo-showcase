import React from 'react';
import { usePathname } from 'expo-router';
import { pushUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { NotificationsBellButton } from '../NotificationsBellButton';
import {
  NOTIFICATIONS_ICON_OFFSET_X,
  NOTIFICATIONS_ICON_OFFSET_Y,
} from '@evoconn/constants/personalProfileLayout';

export const PersonalNotificationsButton = React.memo(function PersonalNotificationsButton() {
  const pathname = usePathname();

  return (
    <NotificationsBellButton
      onPress={() => pushUnlessCurrent(pathname, '/notifications')}
      hitSlop={12}
      activeOpacity={0.6}
      touchableStyle={{
        transform: [
          { translateX: NOTIFICATIONS_ICON_OFFSET_X },
          { translateY: NOTIFICATIONS_ICON_OFFSET_Y },
        ],
      }}
    />
  );
});
