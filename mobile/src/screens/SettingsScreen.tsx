/**
 * SettingsScreen
 *
 * Fully functional, config-driven settings screen.
 * Follows the standard app shell:
 *   AppTopBar (fixed top) + BottomCommunityTabs (fixed bottom) + SidebarDrawer.
 * Content scrolls between the two fixed bars.
 *
 * Architecture:
 *   - SECTIONS_CONFIG generates all section/row data.
 *   - SettingsSection + SettingsRow handle all visual rendering.
 *   - Toggle state is managed locally and synced to AISettingsContext.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { DAILY_USES_LIMIT } from '@evoconn/services/userStatsStorage';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { getClanProfileByHouse } from '@evoconn/utils/getClanProfileByHouse';
import { useAISettings } from '@evoconn/hooks/AISettingsContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_BG   = '#0b0b0f';
const DIVIDER   = 'rgba(255,255,255,0.06)';
const ICON_SIZE = 34;

// ── Global inner-icon layout controls ─────────────────────────────────────────
const SETTINGS_ICON_INNER_SIZE    = 18;
const SETTINGS_ICON_INNER_SCALE   = 1;
const SETTINGS_ICON_INNER_OFFSET_X = 0;
const SETTINGS_ICON_INNER_OFFSET_Y = 0;

// ── Profile avatar icon controls ───────────────────────────────────────────────
// Affect ONLY the SVG glyph inside the avatar circle — not the circle itself.
const PROFILE_ICON_SCALE   = 1.3;
const PROFILE_ICON_OFFSET_X = 0;
const PROFILE_ICON_OFFSET_Y = -3;
const PROFILE_ICON_BASE_SIZE = 54; // px — fits comfortably inside the 60px circle

const IC = {
  blue:   '#3B82F6',
  amber:  '#D97706',
  purple: '#7C3AED',
  green:  '#10B981',
  neon:   '#8BAD00',
  slate:  '#475569',
  pink:   '#DB2777',
  cyan:   '#0891B2',
  gray:   '#4B5563',
  red:    '#DC2626',
  teal:   '#0D9488',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType = 'navigate' | 'toggle' | 'info' | 'action' | 'danger' | 'upgrade';

interface SettingRow {
  id:           string;
  label:        string;
  subtitle?:    string;
  icon:         string;
  iconBg:       string;
  type:         RowType;
  value?:       string;
  checked?:     boolean;
  onToggleKey?: keyof ToggleState;
  hideDivider?: boolean;
  onPress?:     () => void;
}

interface SettingSection {
  id:    string;
  title: string;
  rows:  SettingRow[];
}

interface ToggleState {
  notifications:          boolean;
  reflectiveQuestion:     boolean;
  philosophicalRefs:      boolean;
  publicProfile:          boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconInner({
  name,
  color = '#ffffff',
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
}) {
  return (
    <View
      style={{
        transform: [
          { translateX: SETTINGS_ICON_INNER_OFFSET_X },
          { translateY: SETTINGS_ICON_INNER_OFFSET_Y },
          { scale: SETTINGS_ICON_INNER_SCALE },
        ],
      }}
    >
      <Ionicons name={name} size={SETTINGS_ICON_INNER_SIZE} color={color} />
    </View>
  );
}

interface RowProps {
  row:            SettingRow;
  isFirst:        boolean;
  isLast:         boolean;
  toggleState:    ToggleState;
  onToggleChange: (key: keyof ToggleState, val: boolean) => void;
}

function SettingsRow({ row, isFirst, isLast, toggleState, onToggleChange }: RowProps) {
  const isToggle  = row.type === 'toggle';
  const isInfo    = row.type === 'info';
  const isDanger  = row.type === 'danger';
  const isUpgrade = row.type === 'upgrade';

  const handlePress = useCallback(() => {
    if (row.onPress) { row.onPress(); return; }
    if (isDanger)    { return; }
    if (isUpgrade)   { return; }
    if (!isInfo && !isToggle) {
      Alert.alert('Próximamente', 'Esta sección está en desarrollo.');
    }
  }, [row, isDanger, isInfo, isToggle, isUpgrade]);

  const toggleValue = row.onToggleKey ? toggleState[row.onToggleKey] : false;

  if (isUpgrade) {
    return (
      <>
        {!isFirst && <View style={styles.divider} />}
        <TouchableOpacity
          style={[styles.row, styles.upgradeRow]}
          onPress={row.onPress ?? handlePress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: IC.amber }]}>
            <IconInner name="star" />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.upgradeLabel}>Actualizar a Premium</Text>
            <Text style={styles.rowSubtitle}>Acceso ilimitado a IA y funciones avanzadas</Text>
          </View>
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>PRO</Text>
          </View>
        </TouchableOpacity>
      </>
    );
  }

  if (isDanger) {
    return (
      <>
        {!isFirst && <View style={styles.divider} />}
        <TouchableOpacity
          style={styles.row}
          onPress={row.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: IC.red }]}>
            <IconInner name={row.icon as React.ComponentProps<typeof Ionicons>['name']} />
          </View>
          <Text style={styles.dangerLabel}>{row.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      {!isFirst && <View style={styles.divider} />}
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        activeOpacity={isInfo || isToggle ? 1 : 0.7}
        disabled={isInfo && !row.onPress}
      >
        <View style={[styles.iconBox, { backgroundColor: row.iconBg }]}>
          <IconInner name={row.icon as React.ComponentProps<typeof Ionicons>['name']} />
        </View>

        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {row.subtitle ? (
            <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
          ) : null}
        </View>

        {isToggle && row.onToggleKey ? (
          <Switch
            value={toggleValue}
            onValueChange={(v) => onToggleChange(row.onToggleKey!, v)}
            trackColor={{ false: 'rgba(255,255,255,0.12)', true: evoconnColors.neonGreen }}
            thumbColor="#ffffff"
            ios_backgroundColor="rgba(255,255,255,0.12)"
          />
        ) : isInfo ? (
          <Text style={styles.rowValue}>{row.value}</Text>
        ) : (
          <View style={styles.rowRight}>
            {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
            <Text style={styles.chevron}>›</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

interface SectionProps {
  section:        SettingSection;
  toggleState:    ToggleState;
  onToggleChange: (key: keyof ToggleState, val: boolean) => void;
}

function SettingsSection({ section, toggleState, onToggleChange }: SectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.rows.map((row, idx) => (
          <SettingsRow
            key={row.id}
            row={row}
            isFirst={idx === 0}
            isLast={idx === section.rows.length - 1}
            toggleState={toggleState}
            onToggleChange={onToggleChange}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Profile header ───────────────────────────────────────────────────────────

function ProfileHeader() {
  const activeClan  = useActiveClan(mockCurrentUser.clanId);
  const ProfileIcon = useMemo(() => getClanProfileByHouse(activeClan), [activeClan]);
  const { visibleClanId } = useClassification();
  const effectiveClan = visibleClanId ?? activeClan;
  const clanColor     = effectiveClan ? CLAN_TO_COLOR[effectiveClan as keyof typeof CLAN_TO_COLOR] ?? null : null;

  const rank = mockCurrentUser.rank
    ? mockCurrentUser.rank.charAt(0).toUpperCase() + mockCurrentUser.rank.slice(1)
    : 'Aprendiz';

  return (
    <TouchableOpacity
      style={styles.profileHeader}
      activeOpacity={0.8}
      onPress={() => Alert.alert('Próximamente', 'El editor de perfil está en desarrollo.')}
    >
      {/* Avatar — clan SVG replaces the initial letter */}
      <View style={styles.avatarWrap}>
        <View style={[
          styles.avatar,
          clanColor ? { backgroundColor: `${clanColor}1F`, borderRadius: 30 } : undefined,
        ]}>
          <View
            style={{
              transform: [
                { translateX: PROFILE_ICON_OFFSET_X },
                { translateY: PROFILE_ICON_OFFSET_Y },
                { scale: PROFILE_ICON_SCALE },
              ],
            }}
          >
            <ProfileIcon
              width={PROFILE_ICON_BASE_SIZE}
              height={PROFILE_ICON_BASE_SIZE}
            />
          </View>
        </View>
        <View style={styles.avatarEditBadge}>
          <Text style={styles.avatarEditChar}>✎</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{mockCurrentUser.username}</Text>
        <Text style={styles.profileHandle}>
          {mockCurrentUser.username.startsWith('@')
            ? mockCurrentUser.username.toLowerCase()
            : `@${mockCurrentUser.username.toLowerCase()}`}
        </Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen({ onLogout }: { onLogout?: () => void }) {
  const router                    = useRouter();
  const insets                    = useSafeAreaInsets();
  const { height: screenH }       = useWindowDimensions();
  const { thoughts }              = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── AI Settings context ───────────────────────────────────────────────────
  const {
    setIncludeReflectiveQuestion,
    setIncludePhilosophicalReferences,
  } = useAISettings();

  const [toggles, setToggles] = useState<ToggleState>({
    notifications:      true,
    reflectiveQuestion: true,
    philosophicalRefs:  true,
    publicProfile:      true,
  });

  const onToggleChange = useCallback((key: keyof ToggleState, val: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: val }));
    // Sync AI output flags to context
    if (key === 'reflectiveQuestion')  setIncludeReflectiveQuestion(val);
    if (key === 'philosophicalRefs')   setIncludePhilosophicalReferences(val);
  }, [setIncludeReflectiveQuestion, setIncludePhilosophicalReferences]);

  const handleBottomTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const topBarHeight    = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  const usesLeft = mockUserStats.dailyUsesLeft;

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => Alert.alert('Próximamente', 'Función en desarrollo.') },
      ],
    );
  }, []);

  const defaultLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión actual?', [
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);
  const confirmLogout = onLogout ?? defaultLogout;

  // Subscription rows all show this message (no backend, no navigation).
  const showSubscriptionAlert = useCallback(() => {
    Alert.alert(
      '',
      'La app no cuenta con versiones premium todavía, gracias por la intención de apoyo igualmente ;)',
      [{ text: 'OK' }],
    );
  }, []);

  // Config-driven sections.
  const SECTIONS: SettingSection[] = [
    {
      id: 'account',
      title: 'CUENTA',
      rows: [
        { id: 'email',   label: 'Correo electrónico', value: 'rodrigo@evoconn.app', icon: 'mail-outline',        iconBg: IC.blue,  type: 'navigate' },
        { id: 'phone',   label: 'Teléfono',           value: 'No vinculado',        icon: 'call-outline',        iconBg: IC.blue,  type: 'navigate' },
        { id: 'pass',    label: 'Contraseña y seguridad',                           icon: 'lock-closed-outline', iconBg: IC.slate, type: 'navigate' },
        { id: 'linked',  label: 'Cuentas vinculadas',  subtitle: 'Google, Apple…',  icon: 'link-outline',        iconBg: IC.gray,  type: 'navigate' },
      ],
    },
    {
      id: 'subscription',
      title: 'SUSCRIPCIÓN',
      rows: [
        { id: 'plan',    label: 'Plan actual', value: 'Gratis', icon: 'card-outline',    iconBg: IC.gray,  type: 'navigate', onPress: showSubscriptionAlert },
        { id: 'upgrade', label: '',            icon: 'star',    iconBg: IC.amber,         type: 'upgrade',  onPress: showSubscriptionAlert },
        { id: 'restore', label: 'Restaurar compras',            icon: 'refresh-outline', iconBg: IC.gray,  type: 'action',   onPress: showSubscriptionAlert },
      ],
    },
    {
      id: 'personalization',
      title: 'PERSONALIZACIÓN',
      rows: [
        // Tema, Intensidad filosófica, Estilo de debate removed (not yet available).
        { id: 'lang',   label: 'Idioma',          value: 'Español', icon: 'globe-outline',         iconBg: IC.cyan,  type: 'info' },
        { id: 'notifs', label: 'Notificaciones',                    icon: 'notifications-outline', iconBg: IC.pink,  type: 'toggle', onToggleKey: 'notifications' },
        { id: 'pref-con', label: 'Preferencia de contenido', value: 'Frases', icon: 'list-outline', iconBg: IC.neon, type: 'navigate' },
      ],
    },
    {
      id: 'ai',
      title: 'INTELIGENCIA ARTIFICIAL',
      rows: [
        { id: 'ai-uses',   label: 'Usos de IA hoy',         value: `${usesLeft} / ${DAILY_USES_LIMIT}`,         icon: 'flash-outline',        iconBg: IC.green,  type: 'info' },
        // Modo de IA removed.
        { id: 'ai-ref-q',  label: 'Preguntas reflexivas',   subtitle: 'Incluir pregunta socrática',     icon: 'flask-outline',        iconBg: IC.cyan,   type: 'toggle', onToggleKey: 'reflectiveQuestion' },
        { id: 'ai-phi',    label: 'Referencias filosóficas', subtitle: 'Citar filósofos',               icon: 'book-outline',         iconBg: IC.purple, type: 'toggle', onToggleKey: 'philosophicalRefs' },
        // Contraargumentos always ON — no toggle shown.
      ],
    },
    {
      id: 'privacy',
      title: 'PRIVACIDAD Y DATOS',
      rows: [
        { id: 'data-use',  label: 'Uso de datos',                                  icon: 'pie-chart-outline', iconBg: IC.slate, type: 'navigate' },
        { id: 'download',  label: 'Descargar mis datos',                            icon: 'download-outline',  iconBg: IC.slate, type: 'action' },
        { id: 'pub-prof',  label: 'Perfil público', subtitle: 'Visible para todos', icon: 'eye-outline',       iconBg: IC.gray,  type: 'toggle', onToggleKey: 'publicProfile' },
        // Mostrar estadísticas removed.
        { id: 'delete',    label: 'Eliminar cuenta',                                icon: 'trash-outline',     iconBg: IC.red,   type: 'danger', onPress: confirmDeleteAccount },
      ],
    },
    {
      id: 'community',
      title: 'COMUNIDAD',
      rows: [
        { id: 'blocked',   label: 'Usuarios bloqueados',           icon: 'person-remove-outline',    iconBg: IC.slate, type: 'navigate' },
        { id: 'reports',   label: 'Historial de reportes',         icon: 'flag-outline',             iconBg: IC.slate, type: 'navigate' },
        { id: 'mod',       label: 'Preferencias de moderación',    icon: 'shield-checkmark-outline', iconBg: IC.gray,  type: 'navigate' },
      ],
    },
    {
      id: 'support',
      title: 'SOPORTE',
      rows: [
        { id: 'bug',     label: 'Reportar un error', icon: 'bug-outline',                 iconBg: IC.pink,  type: 'action' },
        { id: 'help',    label: 'Centro de ayuda',   icon: 'help-circle-outline',         iconBg: IC.cyan,  type: 'action' },
        { id: 'contact', label: 'Contactar soporte', icon: 'chatbubble-ellipses-outline', iconBg: IC.blue,  type: 'action' },
      ],
    },
    {
      id: 'legal',
      title: 'LEGAL',
      rows: [
        { id: 'terms',   label: 'Términos de servicio',   icon: 'document-text-outline', iconBg: IC.gray, type: 'navigate' },
        { id: 'privacy', label: 'Política de privacidad', icon: 'shield-outline',        iconBg: IC.gray, type: 'navigate' },
      ],
    },
    {
      id: 'info',
      title: 'INFORMACIÓN',
      rows: [
        { id: 'version', label: 'Versión', value: '1.0.0', icon: 'information-circle-outline', iconBg: IC.gray, type: 'info' },
        { id: 'build',   label: 'Build',   value: '(42)',   icon: 'cube-outline',               iconBg: IC.gray, type: 'info' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.back()}
      />

      <View style={[styles.contentWrap, { height: contentHeight }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Page title ── */}
          <Text style={styles.pageTitle}>Ajustes</Text>

          {/* ── Profile header (clan SVG avatar) ── */}
          <ProfileHeader />

          {/* ── Dynamic sections ── */}
          {SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              section={section}
              toggleState={toggles}
              onToggleChange={onToggleChange}
            />
          ))}

          {/* ── Logout ── */}
          <View style={styles.logoutWrap}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={confirmLogout}
              activeOpacity={0.75}
            >
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      <View
        style={[
          styles.bottomTabsWrap,
          {
            paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
            paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
            bottom: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET,
            borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          },
        ]}
      >
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </View>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) =>
          router.push({ pathname: '/reflection', params: { thoughtId: id } })
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentWrap: {
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 0,
  },

  // ── Page title ──
  pageTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 20,
    marginTop: 8,
  },

  // ── Profile header ──
  profileHeader: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2a2a38',
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditChar: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileHandle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '400',
  },
  rankBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(199,255,2,0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(199,255,2,0.25)',
  },
  rankText: {
    color: evoconnColors.neonGreen,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Sections ──
  sectionWrap: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 52,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
    fontWeight: '400',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '400',
  },
  chevron: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 26,
    marginRight: -2,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 14 + ICON_SIZE + 12, // align with text, not icon
  },

  // ── Danger row ──
  dangerLabel: {
    flex: 1,
    color: evoconnColors.danger,
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Upgrade row ──
  upgradeRow: {
    backgroundColor: 'rgba(217,175,51,0.07)',
    borderRadius: 0,
    paddingVertical: 14,
  },
  upgradeLabel: {
    color: '#F5C842',
    fontSize: 15,
    fontWeight: '700',
  },
  upgradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#D97706',
    borderRadius: 6,
    flexShrink: 0,
  },
  upgradeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Logout ──
  logoutWrap: {
    marginBottom: 12,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: evoconnColors.danger,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  bottomSpacer: {
    height: 24,
  },
  bottomTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: evoconnColors.background,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
  },
});
