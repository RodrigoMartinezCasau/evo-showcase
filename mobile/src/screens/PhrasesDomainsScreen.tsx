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
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { evoconnColors } from '@evoconn/theme/colors';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { getTopBarLapizByHouse } from '@evoconn/utils/getTopBarLapizByHouse';
import { getQuotesByDomain } from '@evoconn/data/quotes';
import { TOTAL_QUOTES_IN_DB } from '@evoconn/logic/quotes/getDomainStats';
import {
  getClanPhrasesScrollPaddingBottom,
  getClanPhrasesShellBodyHeight,
} from '@evoconn/constants/appShellLayout';
import { QUOTES_PENCIL_ICON_SCALE } from '@evoconn/constants/streakLayout';
import {
  HERO_SUMMARY_ROW_GAP,
  heroIconSlotSize,
  heroIconVisualScale,
} from '@evoconn/constants/heroSummaryCardLayout';
import { getClanStreakColors } from '@evoconn/constants/clanStreakColors';
import { IS_DEBUG_STATS_MODE, useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { DomainStats } from '@evoconn/logic/quotes/getDomainStats';
import type { Quote } from '@evoconn/types/quotes';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';

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
const PHRASES_PROGRESS_RADIUS = 999;

/** Sin-clan gradient end color: WHITE → #c7ff02 (neon green, same as app's no-clan accent). */
const NO_CLAN_BAR_COLOR = '#c7ff02';

// ─── Gradient progress bar (mirrors DailyUsesScreen GradBar) ─────────────────

function GradBar({
  unlocked,
  total,
  clanColor,
}: {
  unlocked: number;
  total:    number;
  clanColor: string;
}) {
  const [barW, setBarW] = useState(0);
  const ratio  = total > 0 ? Math.min(unlocked / total, 1) : 0;
  const fillW  = barW > 0 ? Math.round(barW * ratio) : 0;

  return (
    <View
      style={styles.progressTrack}
      onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
    >
      {barW > 0 && fillW > 0 && (
        <Svg
          width={barW}
          height={PHRASES_PROGRESS_H}
          style={StyleSheet.absoluteFillObject}
        >
          <Defs>
            {/*
             * gradientUnits="userSpaceOnUse" + x2={fillW} keeps the gradient
             * WHITE → CLAN across the actual filled pixels only, so the clan
             * color always appears at the rightmost edge of the fill regardless
             * of how many phrases are unlocked.
             */}
            <LinearGradient
              id="phrasesGrad"
              x1={0} y1={0}
              x2={fillW} y2={0}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor={clanColor}  stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0} y={0}
            width={fillW} height={PHRASES_PROGRESS_H}
            rx={PHRASES_PROGRESS_RADIUS} ry={PHRASES_PROGRESS_RADIUS}
            fill="url(#phrasesGrad)"
          />
        </Svg>
      )}
    </View>
  );
}

// ─── Domain detail modal ──────────────────────────────────────────────────────

type DetailModalProps = {
  domain: DomainStats | null;
  unlockedIds: Set<string>;
  onClose: () => void;
};

function DomainDetailModal({ domain, unlockedIds, onClose }: DetailModalProps) {
  if (!domain) return null;

  const quotes = getQuotesByDomain(domain.id);

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
                      </View>
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
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { thoughts } = useThoughts();

  const activeClan  = useActiveClan(mockCurrentUser.clanId);
  const LapizIcon   = useMemo(() => getTopBarLapizByHouse(activeClan), [activeClan]);

  // Clan bar color: primary clan color or pink fallback for no-clan users.
  const barClanColor = useMemo(
    () => (activeClan ? getClanStreakColors(activeClan).primary : NO_CLAN_BAR_COLOR),
    [activeClan],
  );

  const { totalUnlocked, domainStats, unlockedPhraseIds } = useQuotes();
  const unlockedSet = useMemo(() => new Set(unlockedPhraseIds), [unlockedPhraseIds]);

  // In debug mode the simulated count overrides the real unlocked count.
  const { unlockedPhrases: simulatedUnlocked } = useDebugStats();
  const computedUnlocked = IS_DEBUG_STATS_MODE ? simulatedUnlocked : totalUnlocked;

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const ready = useDeferredRender();
  const [detailDomain, setDetailDomain] = useState<DomainStats | null>(null);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const openDetail = useCallback((stat: DomainStats) => {
    setDetailDomain(stat);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailDomain(null);
  }, []);

  const iconSlot = useMemo(() => heroIconSlotSize(screenW), [screenW]);
  const pencilVisualScale = useMemo(
    () => heroIconVisualScale(PHRASES_COUNT_FONT, iconSlot, QUOTES_PENCIL_ICON_SCALE),
    [iconSlot],
  );

  const bodyHeight = getClanPhrasesShellBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        showClanIcon
      />

      {/* Misma franja bajo el top bar que Para Ti (no flex hasta el borde con la barra encima). */}
      <View style={{ height: bodyHeight, overflow: 'hidden', flexGrow: 0 }}>
        {!ready ? (
          <ClanLoadingDot clanId={activeClan} />
        ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: getClanPhrasesScrollPaddingBottom(
                insets.bottom,
                screenH,
                safeFrame.height,
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        {/* ── Summary card ──────────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.heroCenterSlot}>
            <View style={[styles.heroBlock, { gap: HERO_SUMMARY_ROW_GAP }]}>
              <View style={[styles.iconSlot, { width: iconSlot, height: iconSlot }]}>
                <View
                  style={[
                    styles.iconScaledInner,
                    {
                      width: PHRASES_COUNT_FONT,
                      height: PHRASES_COUNT_FONT,
                      transform: [{ scale: pencilVisualScale }],
                    },
                  ]}
                >
                  <LapizIcon width={PHRASES_COUNT_FONT} height={PHRASES_COUNT_FONT} />
                </View>
              </View>
              <View style={styles.qRightBlock}>
                <Text style={styles.summaryCount}>{computedUnlocked}</Text>
                <Text style={styles.summaryLabel}>FRASES DESBLOQUEADAS</Text>
              </View>
            </View>
          </View>

          {/* Progress bar — full card width, below the row */}
          <GradBar
            unlocked={computedUnlocked}
            total={TOTAL_QUOTES_IN_DB}
            clanColor={barClanColor}
          />

          {/* Sub row — full width below the bar */}
          <View style={styles.summarySubRow}>
            <Text style={styles.summarySubLeft}>
              de {TOTAL_QUOTES_IN_DB} en total
            </Text>
            <Text style={styles.summarySubRight}>
              {Math.max(0, TOTAL_QUOTES_IN_DB - computedUnlocked)} por desbloquear
            </Text>
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
            Las frases asociadas a tus reflexiones provienen exclusivamente de esta base de datos enteramente diseñada por @Evoconn.
          </Text>
        </View>
        </ScrollView>
        )}
      </View>

      {/* Bottom bar */}
      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      {/* Sidebar */}
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          const target = thoughts.find((t) => t.id === id);
          if (target?.type === 'phrase') {
            router.push({ pathname: '/phrase', params: { phraseId: id } });
            return;
          }
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
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
    gap: 10,
  },
  heroCenterSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconScaledInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // RIGHT block: big number + label
  qRightBlock: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
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
  },
  // Sub row below both columns
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
