import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  INSIGNIA_BOX_MARGIN_HORIZONTAL,
  INSIGNIA_BOX_HEIGHT,
  INSIGNIA_BOX_OFFSET_X,
  INSIGNIA_BOX_OFFSET_Y,
  OTHER_INSIGNIA_CARD_OPACITY,
} from '@evoconn/constants/otherProfileLayout';

type Props = {
  phrase: string;
};

export const UserInsigniaPhrase = React.memo(function UserInsigniaPhrase({ phrase }: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          marginHorizontal: INSIGNIA_BOX_MARGIN_HORIZONTAL,
          transform: [{ translateX: INSIGNIA_BOX_OFFSET_X }, { translateY: INSIGNIA_BOX_OFFSET_Y }],
        },
        INSIGNIA_BOX_HEIGHT !== undefined && { height: INSIGNIA_BOX_HEIGHT },
      ]}
    >
      <Text style={styles.text}>{phrase}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingLeft: 14,
    paddingVertical: 14,
    backgroundColor: `rgba(0,0,0,${OTHER_INSIGNIA_CARD_OPACITY})`,
    borderRadius: 12,
    paddingRight: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
