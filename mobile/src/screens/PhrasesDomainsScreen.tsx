/**
 * PhrasesDomainsScreen — opened when the user taps the pencil icon.
 * Shows total unlocked phrases and progress per domain.
 * Tapping a domain opens a detail sheet with all phrases in that domain.
 *
 * Layout: standard app shell (AppTopBar + BottomCommunityTabs + SidebarDrawer).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { evoconnColors } from '@evoconn/theme/colors';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { getTopBarLapizByHouse } from '@evoconn/utils/getTopBarLapizByHouse';
import { getQuotesByDomain } from '@evoconn/data/quotes';
import { TOTAL_QUOTES_IN_DB } from '@evoconn/logic/quotes/getDomainStats';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  QUOTES_PENCIL_ICON_SCALE,
  QUOTES_PENCIL_ICON_OFFSET_X,
  QUOTES_PENCIL_ICON_OFFSET_Y,
  QUOTES_SUMMARY_TEXT_GROUP_OFFSET_X,
  QUOTES_SUMMARY_TEXT_GROUP_OFFSET_Y,
} from '@evoconn/constants/streakLayout';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { DomainStats } from '@evoconn/logic/quotes/getDomainStats';
import type { Quote } from '@evoconn/types/quotes';

// ─── Layout editors ───────────────────────────────────────────────────────────

const PHRASES_CARD_PADDING_H = 16;
const PHRASES_CARD_PADDING_V = 14;
const PHRASES_SECTION_GAP    = 10;
const PHRASES_CARD_RADIUS    = 14;
const PHRASES_CARD_BG        = '#0b0b0f';
const PHRASES_COUNT_FONT     = 52;
const PHRASES_LABEL_FONT     = 11;
const PHRASES_DOMAIN_FONT    = 14;
const PHRASES_PROGRESS_H     = 5;

// ─── Domain detail modal ──────────────────────────────────────────────────────

type DetailModalProps = {
  domain: DomainStats | null;
  unlockedIds: Set<string>;
  onClose: () => void;
};

function DomainDetailModal({ domain, unlockedIds, onClose }: DetailModalProps) {
  if (!domain) return null;

  const quotes = getQuotesByDomain(domain.id);

  const difficultyLabel: Record<string, string> = {
    beginner:     'Inicial',
    intermediate: 'Medio',
    advanced:     'Avanzado',
  };

  return (
    <Modal
      visible={domain !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
            <Text style={styles.modalTitle}>{domain.label}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={16} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={evoconnColors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            {domain.unlocked} de {domain.total} frases desbloqueadas · {domain.percentage}%
          </Text>

          {/* Progress bar */}
          <View style={styles.modalProgressTrack}>
            <View
              style={[
                styles.modalProgressFill,
                {
                  width: `${domain.percentage}%` as `${number}%`,
                  backgroundColor: domain.color,
                },
              ]}
            />
          </View>

          {/* Phrases list */}
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {quotes.map(q => {
              const unlocked = unlockedIds.has(q.id);
              return (
                <View
                  key={q.id}
                  style={[
                    styles.phraseCard,
                    !unlocked && styles.phraseCardLocked,
                  ]}
                >
                  {unlocked ? (
                    <>
                      <Text style={styles.phraseText}>"{q.text}"</Text>
                      <View style={styles.phraseMetaRow}>
                        <Text style={styles.phraseAuthor}>— {q.author}</Text>
                        {q.sourceBook && (
                          <Text style={styles.phraseBook}>{q.sourceBook}</Text>
                        )}
                        {q.difficulty && (
                          <View style={[styles.diffBadge, { borderColor: domain.color }]}>
                            <Text style={[styles.diffBadgeText, { color: domain.color }]}>
                              {difficultyLabel[q.difficulty] ?? q.difficulty}
                            </Text>
                          </View>
                        )}
                      </View>
                      {q.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                          {q.tags.slice(0, 4).map(tag => (
                            <View key={tag} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed" size={14} color={evoconnColors.muted} />
                      <Text style={styles.lockedText}>Frase bloqueada</Text>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Domain card ──────────────────────────────────────────────────────────────

type DomainCardProps = {
  stat:      DomainStats;
  onPress:   (stat: DomainStats) => void;
};

function DomainCard({ stat, onPress }: DomainCardProps) {
  return (
    <TouchableOpacity
      style={styles.domainCard}
      onPress={() => onPress(stat)}
      activeOpacity={0.7}
    >
      <View style={styles.domainCardRow}>
        <View style={styles.domainLeft}>
          <View style={[styles.domainDot, { backgroundColor: stat.color }]} />
          <Text style={styles.domainName}>{stat.label}</Text>
        </View>
        <View style={styles.domainRight}>
          <Text style={[styles.domainPct, { color: stat.percentage > 0 ? stat.color : evoconnColors.muted }]}>
            {stat.percentage}%
          </Text>
          <Text style={styles.domainFraction}>
            {stat.unlocked}/{stat.total}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={evoconnColors.muted} style={{ marginLeft: 4 }} />
        </View>
      </View>

      {/* Progress track */}
      <View style={styles.progressTrack}>
        {stat.percentage > 0 && (
          <View
            style={[
              styles.progressFill,
              {
                width: `${stat.percentage}%` as `${number}%`,
                backgroundColor: stat.color,
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PhrasesDomainsScreen() {
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { thoughts } = useThoughts();

  const activeClan  = useActiveClan(mockCurrentUser.clanId);
  const LapizIcon   = useMemo(() => getTopBarLapizByHouse(activeClan), [activeClan]);

  const { totalUnlocked, domainStats, unlockedPhraseIds } = useQuotes();
  const unlockedSet = useMemo(() => new Set(unlockedPhraseIds), [unlockedPhraseIds]);

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [activeTab,    setActiveTab]    = useState<TabId>('feed');
  const [detailDomain, setDetailDomain] = useState<DomainStats | null>(null);

  // ─── Bottom bar height ───────────────────────────────────────────────────────
  const bottomBarH = BOTTOM_BAR_LAYOUT.BAR_TOTAL_HEIGHT + insets.bottom;

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (tab === 'feed')    router.replace('/(tabs)');
      if (tab === 'explore') router.push('/explore' as never);
      if (tab === 'create')  router.push('/reflection');
    },
    [router],
  );

  const openDetail = useCallback((stat: DomainStats) => {
    setDetailDomain(stat);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailDomain(null);
  }, []);

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        showClanIcon
      />

      {/* Scrollable body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomBarH + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary card ──────────────────────────────────────────────────── */}
        <View style={[styles.summaryCard, styles.heroCard]}>
          {/* ── Pencil icon — clan-based, same pattern as streak fire icon ── */}
          <View
            style={[
              styles.pencilIconWrap,
              {
                width:  PHRASES_COUNT_FONT,
                height: PHRASES_COUNT_FONT,
                transform: [
                  { translateX: QUOTES_PENCIL_ICON_OFFSET_X },
                  { translateY: QUOTES_PENCIL_ICON_OFFSET_Y },
                  { scale:      QUOTES_PENCIL_ICON_SCALE     },
                ],
              },
            ]}
          >
            <LapizIcon width={PHRASES_COUNT_FONT} height={PHRASES_COUNT_FONT} />
          </View>

          {/* ── Text group + sub-content ── */}
          <View
            style={[
              styles.summaryTextGroup,
              {
                transform: [
                  { translateX: QUOTES_SUMMARY_TEXT_GROUP_OFFSET_X },
                  { translateY: QUOTES_SUMMARY_TEXT_GROUP_OFFSET_Y },
                ],
              },
            ]}
          >
            <Text style={styles.summaryCount}>{totalUnlocked}</Text>
            <Text style={styles.summaryLabel}>FRASES DESBLOQUEADAS</Text>
            <View style={styles.summaryDivider} />
            <View style={styles.summarySubRow}>
              <Text style={styles.summarySubLeft}>
                de {TOTAL_QUOTES_IN_DB} en total
              </Text>
              <Text style={styles.summarySubRight}>
                {TOTAL_QUOTES_IN_DB - totalUnlocked} por desbloquear
              </Text>
            </View>
            {/* Overall progress bar */}
            <View style={[styles.progressTrack, { marginTop: 10 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((totalUnlocked / TOTAL_QUOTES_IN_DB) * 100)}%` as `${number}%`,
                    backgroundColor: '#C2A23E',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ── Section header ────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>DOMINIOS</Text>

        {/* ── Domain cards ──────────────────────────────────────────────────── */}
        <View style={styles.domainsContainer}>
          {domainStats.map(stat => (
            <DomainCard key={stat.id} stat={stat} onPress={openDetail} />
          ))}
        </View>

        {/* ── Info footer ───────────────────────────────────────────────────── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={evoconnColors.muted} />
          <Text style={styles.infoText}>
            Las frases asociadas a tus reflexiones provienen exclusivamente de esta base de datos.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <BottomCommunityTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Sidebar */}
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) =>
          router.push({ pathname: '/reflection', params: { thoughtId: id } })
        }
      />

      {/* Domain detail modal */}
      <DomainDetailModal
        domain={detailDomain}
        unlockedIds={unlockedSet}
        onClose={closeDetail}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },

  // ── Scroll ──
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: PHRASES_CARD_BG,
    borderRadius: PHRASES_CARD_RADIUS,
    borderWidth: 1,
    borderColor: evoconnColors.border,
    paddingHorizontal: PHRASES_CARD_PADDING_H,
    paddingVertical: PHRASES_CARD_PADDING_V + 4,
    marginBottom: PHRASES_SECTION_GAP + 4,
  },
  // hero row mirrors StreakScreen heroCard: icon wrap + text group side by side
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // pencilIconWrap: fixed-size container; transforms move only the icon, not text
  pencilIconWrap: {
    // size set inline via width/height props
  },
  // text group: column with number + label + divider + sub-row + progress bar
  summaryTextGroup: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  summaryCount: {
    color: evoconnColors.text,
    fontSize: PHRASES_COUNT_FONT,
    fontWeight: '800',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  summaryLabel: {
    color: evoconnColors.muted,
    fontSize: PHRASES_LABEL_FONT,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: evoconnColors.border,
    width: '100%',
    marginVertical: 10,
  },
  summarySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  summarySubLeft: {
    color: evoconnColors.muted,
    fontSize: 12,
  },
  summarySubRight: {
    color: evoconnColors.muted,
    fontSize: 12,
  },

  // ── Section header ──
  sectionHeader: {
    color: evoconnColors.muted,
    fontSize: PHRASES_LABEL_FONT,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Domains ──
  domainsContainer: {
    gap: PHRASES_SECTION_GAP,
    marginBottom: PHRASES_SECTION_GAP,
  },
  domainCard: {
    backgroundColor: PHRASES_CARD_BG,
    borderRadius: PHRASES_CARD_RADIUS,
    borderWidth: 1,
    borderColor: evoconnColors.border,
    paddingHorizontal: PHRASES_CARD_PADDING_H,
    paddingVertical: PHRASES_CARD_PADDING_V,
  },
  domainCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  domainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  domainDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  domainName: {
    color: evoconnColors.text,
    fontSize: PHRASES_DOMAIN_FONT,
    fontWeight: '600',
  },
  domainRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  domainFraction: {
    color: evoconnColors.muted,
    fontSize: 12,
  },

  // ── Progress bar ──
  progressTrack: {
    height: PHRASES_PROGRESS_H,
    borderRadius: 999,
    backgroundColor: evoconnColors.border,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // ── Info box ──
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  infoText: {
    color: evoconnColors.muted,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },

  // ── Detail Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111116',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalTitle: {
    color: evoconnColors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    color: evoconnColors.muted,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalProgressTrack: {
    height: 4,
    backgroundColor: evoconnColors.border,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  modalScroll: {
    paddingHorizontal: 16,
  },

  // ── Phrase cards (inside modal) ──
  phraseCard: {
    backgroundColor: PHRASES_CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: evoconnColors.border,
    padding: 14,
    marginBottom: 8,
  },
  phraseCardLocked: {
    opacity: 0.45,
  },
  phraseText: {
    color: evoconnColors.text,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  phraseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  phraseAuthor: {
    color: evoconnColors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  phraseBook: {
    color: evoconnColors.muted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: evoconnColors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    color: evoconnColors.muted,
    fontSize: 10,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedText: {
    color: evoconnColors.muted,
    fontSize: 12,
  },
});
