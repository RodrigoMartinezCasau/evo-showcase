import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  phrase: string;
};

export const UserInsigniaPhrase = React.memo(function UserInsigniaPhrase({ phrase }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{phrase}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
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
