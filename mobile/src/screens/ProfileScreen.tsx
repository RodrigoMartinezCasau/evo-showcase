import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { AppTopBar, RankBadge, ClanBanner } from '@evoconn/components';
import { getClanCardColor } from '@evoconn/theme/theme';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isOwn = !id || id === mockCurrentUser.id;
  const user = mockCurrentUser;
  const stats = mockUserStats;
  const clanColor = getClanCardColor(user.clanId);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => {}} onClanPress={() => {}} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>{user.username}</Text>
          <View style={styles.badges}>
            {user.clanId ? (
              <ClanBanner clanId={user.clanId} shortLabel={user.clanId.toUpperCase()} />
            ) : (
              <Text style={styles.unassigned}>??</Text>
            )}
            <RankBadge rank={user.rank} />
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.dailyUsesLeft}</Text>
            <Text style={styles.statLabel}>Usos hoy</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.unlockedPhrases}/{stats.unlockedPhrasesTotal}</Text>
            <Text style={styles.statLabel}>Frases</Text>
          </View>
        </View>
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>Cita</Text>
          <Text style={styles.quoteText}>"La vida es lo que pasa mientras diseñas tu reflexión."</Text>
        </View>
        <View style={[styles.parchment, { borderColor: clanColor }]}>
          <Text style={styles.parchmentTitle}>
            {user.clanId ? `Clan ${user.clanId}` : 'Sin clan'}
          </Text>
          <Text style={styles.parchmentBody}>Contenido del clan y filosofía.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 20 },
  username: { color: evoconnColors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unassigned: { color: evoconnColors.text, fontWeight: '800', fontSize: 16 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 16, backgroundColor: evoconnColors.card, borderRadius: 12 },
  stat: { alignItems: 'center' },
  statValue: { color: evoconnColors.neonGreen, fontSize: 20, fontWeight: '700' },
  statLabel: { color: evoconnColors.muted, fontSize: 12, marginTop: 4 },
  quote: { marginBottom: 24 },
  quoteLabel: { color: evoconnColors.muted, fontSize: 12, marginBottom: 4 },
  quoteText: { color: evoconnColors.text, fontStyle: 'italic', fontSize: 14 },
  parchment: { borderWidth: 2, padding: 16, borderRadius: 12 },
  parchmentTitle: { color: evoconnColors.text, fontWeight: '700', marginBottom: 8 },
  parchmentBody: { color: evoconnColors.muted, fontSize: 14 },
});
