import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  INSIGNIA_BOX_MARGIN_HORIZONTAL,
  INSIGNIA_BOX_HEIGHT,
  INSIGNIA_BOX_OFFSET_X,
  INSIGNIA_BOX_OFFSET_Y,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  phrase: string;
};

export const PersonalInsigniaPhrase = React.memo(function PersonalInsigniaPhrase({ phrase }: Props) {
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
    backgroundColor: '#000000',
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
