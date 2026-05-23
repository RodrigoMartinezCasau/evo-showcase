/**
 * SettingsScreen — config-driven settings with real functionality.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { DAILY_USES_LIMIT } from '@evoconn/services/userStatsStorage';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useEvoPreferences } from '@evoconn/hooks/EvoPreferencesContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { isRealUserId, setProfilePrivate } from '@evoconn/services/supabaseSocial';
import { EvoInfoModal } from '@evoconn/components/shared/EvoActionSheetModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_BG   = '#0b0b0f';
const DIVIDER   = 'rgba(255,255,255,0.06)';
const ICON_SIZE = 34;
const NOTIFS_KEY = '@evo/notifications_enabled';

const SETTINGS_ICON_INNER_SIZE    = 18;
const SETTINGS_ICON_INNER_SCALE   = 1;
const SETTINGS_ICON_INNER_OFFSET_X = 0;
const SETTINGS_ICON_INNER_OFFSET_Y = 0;

/** Solo tarjeta de perfil en Ajustes (más grande que otros usos de UserAvatarFrame). */
const PROFILE_ICON_SCALE   = 1;
const PROFILE_ICON_OFFSET_X = 0;
const PROFILE_ICON_OFFSET_Y = -3;
const PROFILE_ICON_BASE_SIZE = 80;
const PROFILE_AVATAR_SLOT_SIZE = 68;

const IC = {
  blue:   '#3B82F6',
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

type RowType = 'navigate' | 'toggle' | 'info' | 'action' | 'danger';

interface SettingRow {
  id:           string;
  label:        string;
  subtitle?:    string;
  icon:         string;
  iconBg:       string;
  type:         RowType;
  value?:       string;
  checked?:     boolean;
  onToggleKey?: 'notifications' | 'haptics' | 'privateAccount';
  onPress?:     () => void;
}

interface SettingSection {
  id:    string;
  title: string;
  rows:  SettingRow[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconInner({ name, color = '#ffffff' }: { name: React.ComponentProps<typeof Ionicons>['name']; color?: string }) {
  return (
    <View style={{ transform: [{ translateX: SETTINGS_ICON_INNER_OFFSET_X }, { translateY: SETTINGS_ICON_INNER_OFFSET_Y }, { scale: SETTINGS_ICON_INNER_SCALE }] }}>
      <Ionicons name={name} size={SETTINGS_ICON_INNER_SIZE} color={color} />
    </View>
  );
}

interface RowProps {
  row:               SettingRow;
  isFirst:           boolean;
  notifEnabled:      boolean;
  onNotifToggle:     (val: boolean) => void;
  hapticsEnabled:    boolean;
  onHapticsToggle:   (val: boolean) => void;
  privateAccountEnabled: boolean;
  onPrivateAccountToggle: (val: boolean) => void;
}

function SettingsRow({
  row,
  isFirst,
  notifEnabled,
  onNotifToggle,
  hapticsEnabled,
  onHapticsToggle,
  privateAccountEnabled,
  onPrivateAccountToggle,
}: RowProps) {
  const isToggle  = row.type === 'toggle';
  const isInfo    = row.type === 'info';
  const isDanger  = row.type === 'danger';

  const handlePress = useCallback(() => {
    if (row.onPress) { row.onPress(); return; }
    if (isDanger || isInfo || isToggle) return;
    Alert.alert('Próximamente', 'Esta sección está en desarrollo.');
  }, [row, isDanger, isInfo, isToggle]);

  if (isDanger) {
    return (
      <>
        {!isFirst && <View style={styles.divider} />}
        <TouchableOpacity style={styles.row} onPress={row.onPress} activeOpacity={0.7}>
          <View style={[styles.iconBox, { backgroundColor: IC.red }]}>
            <IconInner name={row.icon as React.ComponentProps<typeof Ionicons>['name']} />
          </View>
          <Text style={styles.dangerLabel}>{row.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </>
    );
  }

  const toggleValue = row.onToggleKey === 'notifications' ? notifEnabled
    : row.onToggleKey === 'haptics' ? hapticsEnabled
    : row.onToggleKey === 'privateAccount' ? privateAccountEnabled
    : false;

  const handleToggleChange = row.onToggleKey === 'notifications' ? onNotifToggle
    : row.onToggleKey === 'haptics' ? onHapticsToggle
    : row.onToggleKey === 'privateAccount' ? onPrivateAccountToggle
    : undefined;

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
          {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
        </View>
        {isToggle && row.onToggleKey ? (
          <Switch
            value={toggleValue}
            onValueChange={handleToggleChange}
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

function SettingsSection({
  section,
  notifEnabled,
  onNotifToggle,
  hapticsEnabled,
  onHapticsToggle,
  privateAccountEnabled,
  onPrivateAccountToggle,
}: {
  section: SettingSection;
  notifEnabled: boolean;
  onNotifToggle: (val: boolean) => void;
  hapticsEnabled: boolean;
  onHapticsToggle: (val: boolean) => void;
  privateAccountEnabled: boolean;
  onPrivateAccountToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.rows.map((row, idx) => (
          <SettingsRow
            key={row.id}
            row={row}
            isFirst={idx === 0}
            notifEnabled={notifEnabled}
            onNotifToggle={onNotifToggle}
            hapticsEnabled={hapticsEnabled}
            onHapticsToggle={onHapticsToggle}
            privateAccountEnabled={privateAccountEnabled}
            onPrivateAccountToggle={onPrivateAccountToggle}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Profile header ───────────────────────────────────────────────────────────

function ProfileHeader({ username, rank: rawRank, onPress }: { username: string; rank: string; onPress: () => void }) {
  const { profile } = useAuth();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { visibleClanId } = useClassification();
  const effectiveClan = visibleClanId ?? activeClan;
  const clanColor = effectiveClan
    ? (CLAN_TO_COLOR[effectiveClan as keyof typeof CLAN_TO_COLOR] ?? null)
    : null;
  const displayName = username || mockCurrentUser.username;
  const rank = rawRank ? rawRank.charAt(0).toUpperCase() + rawRank.slice(1) : 'Aprendiz';

  const rankBadgeStyle = clanColor
    ? { backgroundColor: `${clanColor}1F`, borderColor: `${clanColor}40` }
    : styles.rankBadgeFallback;
  const rankTextStyle = clanColor ? { color: clanColor } : styles.rankTextFallback;

  return (
    <TouchableOpacity style={styles.profileHeader} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <UserAvatarFrame
            clanId={effectiveClan}
            avatarUri={profile?.avatar_url ?? mockCurrentUser.avatarUri}
            size={PROFILE_ICON_BASE_SIZE}
            iconScale={PROFILE_ICON_SCALE}
            iconOffsetX={PROFILE_ICON_OFFSET_X}
            iconOffsetY={PROFILE_ICON_OFFSET_Y}
          />
        </View>
        <View style={styles.avatarEditBadge}><Text style={styles.avatarEditChar}>✎</Text></View>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileHandle}>{displayName.startsWith('@') ? displayName.toLowerCase() : `@${displayName.toLowerCase()}`}</Text>
        <View style={[styles.rankBadge, rankBadgeStyle]}>
          <Text style={[styles.rankText, rankTextStyle]}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function formatPhoneForDisplay(e164: string): string {
  const t = e164.trim();
  if (!t) return '';
  if (t.startsWith('+')) return t;
  return `+${t}`;
}

export default function SettingsScreen({
  onLogout,
  onDeleteAccount,
  deletingAccount,
  userEmail,
  userPhone,
  userUsername,
  userRank,
}: {
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  deletingAccount?: boolean;
  userEmail?: string;
  /** E.164 desde `session.user.phone` tras vincular en Supabase Auth */
  userPhone?: string;
  userUsername?: string;
  userRank?: string;
}) {
  const router                    = useRouter();
  const insets                    = useSafeAreaInsets();
  const safeFrame                 = useSafeAreaFrame();
  const { height: screenH }       = useWindowDimensions();
  const { thoughts }              = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { remainingUses }         = useDebugStats();
  const { profile, refreshProfile } = useAuth();
  const [privateAccountLocal, setPrivateAccountLocal] = useState(false);
  const [privateSaveErrorOpen, setPrivateSaveErrorOpen] = useState(false);
  const [deleteUnavailableOpen, setDeleteUnavailableOpen] = useState(false);
  const [fallbackLogoutInfoOpen, setFallbackLogoutInfoOpen] = useState(false);

  useEffect(() => {
    setPrivateAccountLocal(Boolean(profile?.is_private));
  }, [profile?.is_private]);

  const handlePrivateAccountToggle = useCallback(async (next: boolean) => {
    if (!profile?.id || !isRealUserId(profile.id)) return;
    setPrivateAccountLocal(next);
    const ok = await setProfilePrivate(profile.id, next);
    if (!ok) {
      setPrivateAccountLocal(!next);
      setPrivateSaveErrorOpen(true);
      return;
    }
    await refreshProfile();
  }, [profile?.id, refreshProfile]);

  // ── Notifications toggle (persisted) ─────────────────────────────────────
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFS_KEY).then((val) => {
      if (val !== null) setNotifsEnabled(val === 'true');
    });
  }, []);

  const handleNotifToggle = useCallback((val: boolean) => {
    setNotifsEnabled(val);
    AsyncStorage.setItem(NOTIFS_KEY, String(val)).catch(console.error);
  }, []);

  // ── Haptics toggle (persisted via EvoPreferencesContext) ──────────────────
  const { hapticsEnabled, setHapticsEnabled } = useEvoPreferences();

  const handleBottomTabChange = useCallback(
    (tab: TabId) => { router.navigate({ pathname: '/(tabs)', params: { tab } }); },
    [router],
  );

  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  const fallbackDeleteAccount = useCallback(() => {
    setDeleteUnavailableOpen(true);
  }, []);
  const confirmDeleteAccount  = onDeleteAccount ?? fallbackDeleteAccount;

  const defaultLogout = useCallback(() => {
    setFallbackLogoutInfoOpen(true);
  }, []);
  const confirmLogout = onLogout ?? defaultLogout;

  const SECTIONS: SettingSection[] = useMemo(() => [
    {
      id: 'account',
      title: 'CUENTA',
      rows: [
        {
          id: 'email',
          label: userEmail ? 'Correo electrónico' : 'Vincular correo electrónico',
          subtitle: userEmail ? undefined : 'Tu cuenta usa teléfono. Añade un email para más opciones.',
          value: userEmail || undefined,
          icon: 'mail-outline',
          iconBg: userEmail ? IC.blue : IC.green,
          type: 'navigate',
          onPress: () => router.push('/account-email'),
        },
        {
          id: 'phone',
          label: 'Teléfono',
          value: userPhone?.trim() ? formatPhoneForDisplay(userPhone) : 'No vinculado',
          icon: 'call-outline',
          iconBg: IC.blue,
          type: 'navigate',
          onPress: () => router.push('/account-phone'),
        },
        { id: 'pass',   label: 'Contraseña y seguridad',                      icon: 'lock-closed-outline', iconBg: IC.slate, type: 'navigate', onPress: () => router.push('/account-password') },
        { id: 'linked', label: 'Cuentas vinculadas',  subtitle: 'Google, Apple…', icon: 'link-outline',   iconBg: IC.gray,  type: 'navigate', onPress: () => router.push('/account-linked') },
      ],
    },
    {
      id: 'personalization',
      title: 'PERSONALIZACIÓN',
      rows: [
        { id: 'lang',   label: 'Idioma',        value: 'Español', icon: 'globe-outline',         iconBg: IC.cyan, type: 'info' },
        { id: 'notifs', label: 'Notificaciones',                  icon: 'notifications-outline', iconBg: IC.pink, type: 'toggle', onToggleKey: 'notifications' },
      ],
    },
    {
      id: 'experience',
      title: 'EXPERIENCIA',
      rows: [
        {
          id: 'haptics',
          label: 'Vibraciones',
          subtitle: 'Feedback táctil en animaciones y acciones',
          icon: 'phone-portrait-outline',
          iconBg: IC.purple,
          type: 'toggle',
          onToggleKey: 'haptics',
        },
      ],
    },
    {
      id: 'ai',
      title: 'CONVERSACIONES',
      rows: [
        { id: 'ai-uses', label: 'Usos disponibles hoy', value: `${remainingUses} / ${DAILY_USES_LIMIT}`, icon: 'flash-outline', iconBg: IC.green, type: 'info' },
      ],
    },
    {
      id: 'privacy',
      title: 'PRIVACIDAD Y DATOS',
      rows: [
        ...(isRealUserId(profile?.id)
          ? [{
            id: 'private-account',
            label: 'Cuenta privada',
            subtitle: 'Quien no te siga envía solicitud; tus publicaciones no salen en Para ti.',
            icon: 'lock-closed-outline',
            iconBg: IC.slate,
            type: 'toggle' as const,
            onToggleKey: 'privateAccount' as const,
          }]
          : []),
        { id: 'data-use', label: 'Uso de datos',      icon: 'pie-chart-outline', iconBg: IC.slate, type: 'navigate', onPress: () => router.push('/settings-data-use') },
        { id: 'download', label: 'Descargar mis datos', icon: 'download-outline', iconBg: IC.slate, type: 'navigate', onPress: () => router.push('/settings-export-data') },
        { id: 'delete',   label: deletingAccount ? 'Eliminando…' : 'Eliminar cuenta', icon: 'trash-outline', iconBg: IC.red, type: 'danger', onPress: confirmDeleteAccount },
      ],
    },
    {
      id: 'community',
      title: 'COMUNIDAD',
      rows: [
        { id: 'blocked', label: 'Usuarios bloqueados',  icon: 'person-remove-outline', iconBg: IC.slate, type: 'navigate', onPress: () => router.push('/blocked-users') },
        { id: 'reports', label: 'Historial de reportes', icon: 'flag-outline',          iconBg: IC.slate, type: 'navigate', onPress: () => router.push('/report-history') },
      ],
    },
    {
      id: 'support',
      title: 'SOPORTE',
      rows: [
        { id: 'bug',     label: 'Reportar un error', icon: 'bug-outline',                 iconBg: IC.pink, type: 'navigate', onPress: () => router.push('/report-bug') },
        { id: 'help',    label: 'Centro de ayuda',   icon: 'help-circle-outline',         iconBg: IC.cyan, type: 'navigate', onPress: () => router.push('/settings-help') },
        { id: 'contact', label: 'Contactar soporte', icon: 'chatbubble-ellipses-outline', iconBg: IC.blue, type: 'navigate', onPress: () => router.push('/settings-support') },
      ],
    },
    {
      id: 'legal',
      title: 'LEGAL',
      rows: [
        { id: 'terms',   label: 'Términos de servicio',   icon: 'document-text-outline', iconBg: IC.gray, type: 'navigate', onPress: () => router.push('/settings-terms') },
        { id: 'privacy-policy', label: 'Política de privacidad', icon: 'shield-outline', iconBg: IC.gray, type: 'navigate', onPress: () => router.push('/settings-privacy-policy') },
      ],
    },
    {
      id: 'info',
      title: 'INFORMACIÓN',
      rows: [
        { id: 'version', label: 'Versión', value: '1.0.0', icon: 'information-circle-outline', iconBg: IC.gray, type: 'info' },
      ],
    },
  ], [remainingUses, userEmail, userPhone, deletingAccount, confirmDeleteAccount, router, profile?.id]);

  const handleHapticsToggle = useCallback((val: boolean) => setHapticsEnabled(val), [setHapticsEnabled]);

  return (
    <>
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} onClanPress={() => router.back()} />
      <View style={[styles.contentWrap, { height: contentHeight }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>Ajustes</Text>
          <ProfileHeader
            username={userUsername || mockCurrentUser.username}
            rank={userRank || mockCurrentUser.rank || 'aprendiz'}
            onPress={() => router.push('/profile-editor')}
          />
          {SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              section={section}
              notifEnabled={notifsEnabled}
              onNotifToggle={handleNotifToggle}
              hapticsEnabled={hapticsEnabled}
              onHapticsToggle={handleHapticsToggle}
              privateAccountEnabled={privateAccountLocal}
              onPrivateAccountToggle={handlePrivateAccountToggle}
            />
          ))}
          <View style={styles.logoutWrap}>
            <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.75}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => router.push({ pathname: '/reflection', params: { thoughtId: id } })}
      />
    </View>
    <EvoInfoModal
      visible={privateSaveErrorOpen}
      onClose={() => setPrivateSaveErrorOpen(false)}
      title="No se pudo guardar"
      message="Revisa tu conexión e inténtalo de nuevo."
    />
    <EvoInfoModal
      visible={deleteUnavailableOpen}
      onClose={() => setDeleteUnavailableOpen(false)}
      title="Eliminar cuenta"
      message="Función no disponible."
    />
    <EvoInfoModal
      visible={fallbackLogoutInfoOpen}
      onClose={() => setFallbackLogoutInfoOpen(false)}
      title="Cerrar sesión"
      message="¿Quieres cerrar tu sesión actual? Usa la opción desde la pantalla principal de la app cuando tengas sesión iniciada."
    />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#000000' },
  contentWrap:    { overflow: 'hidden' },
  scroll:         { flex: 1 },
  scrollContent:  { paddingHorizontal: 16, paddingTop: 8, gap: 0 },
  pageTitle:      { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20, marginTop: 8 },

  profileHeader:  { backgroundColor: CARD_BG, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  avatarWrap:     { position: 'relative' },
  avatar:         { width: PROFILE_AVATAR_SLOT_SIZE, height: PROFILE_AVATAR_SLOT_SIZE, alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge:{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#2a2a38', borderWidth: 1.5, borderColor: '#000', alignItems: 'center', justifyContent: 'center' },
  avatarEditChar: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  profileInfo:    { flex: 1, gap: 2 },
  profileName:    { color: '#ffffff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  profileHandle:  { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  rankBadge:      { alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  rankBadgeFallback: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' },
  rankText:       { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  rankTextFallback: { color: 'rgba(255,255,255,0.55)' },

  sectionWrap:    { marginBottom: 28 },
  sectionTitle:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard:    { backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden' },

  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12, minHeight: 52 },
  iconBox:        { width: ICON_SIZE, height: ICON_SIZE, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent:     { flex: 1, gap: 1 },
  rowLabel:       { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  rowSubtitle:    { color: 'rgba(255,255,255,0.38)', fontSize: 12 },
  rowRight:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue:       { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  chevron:        { color: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: '300', lineHeight: 26, marginRight: -2 },
  divider:        { height: 1, backgroundColor: DIVIDER, marginLeft: 14 + ICON_SIZE + 12 },
  dangerLabel:    { flex: 1, color: evoconnColors.danger, fontSize: 15, fontWeight: '500' },

  logoutWrap:     { marginBottom: 12 },
  logoutBtn:      { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', paddingVertical: 16, alignItems: 'center' },
  logoutText:     { color: evoconnColors.danger, fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  bottomSpacer:   { height: 24 },
});
