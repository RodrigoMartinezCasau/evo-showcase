import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import type { IncomingFollowRequest } from '@evoconn/services/supabaseSocial';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { getClanColor } from '@evoconn/constants/clanColors';

const AVATAR_SIZE = 42;
const PROFILE_ICON_SCALE = 1.05;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

type Props = {
  requests: IncomingFollowRequest[];
  busyRequesterId: string | null;
  onPressProfile: (requesterId: string, username: string) => void;
  onAccept: (requesterId: string) => void;
  onReject: (requesterId: string) => void;
};

export function FollowRequestsInbox({
  requests,
  busyRequesterId,
  onPressProfile,
  onAccept,
  onReject,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { visibleClanId } = useClassification();
  const effectiveClan = visibleClanId ?? activeClan;
  const accentColor = getClanColor(effectiveClan);
  const count = requests.length;

  const toggleExpanded = useCallback(() => {
    if (count === 0) return;
    setExpanded((v) => !v);
  }, [count]);

  if (count === 0) return null;

  const previewLabel =
    count === 1 ? '1 solicitud de seguimiento' : `${count} solicitudes de seguimiento`;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.previewRow}
        onPress={toggleExpanded}
        activeOpacity={0.75}
      >
        <View style={[styles.previewIcon, { backgroundColor: `${accentColor}1F` }]}>
          <Ionicons name="person-add-outline" size={20} color={accentColor} />
        </View>
        <Text style={styles.previewText}>{previewLabel}</Text>
        <View style={[styles.countBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(255,255,255,0.45)"
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.expandedList}>
          {requests.map((req, index) => {
            const username = req.username.replace(/^@+/, '');
            const busy = busyRequesterId === req.requesterId;
            return (
              <View
                key={req.requesterId}
                style={[styles.requestRow, index > 0 && styles.requestRowBorder]}
              >
                <TouchableOpacity
                  onPress={() => onPressProfile(req.requesterId, req.username)}
                  activeOpacity={0.6}
                  hitSlop={4}
                >
                  <View style={styles.avatarWrap}>
                    <UserAvatarFrame
                      clanId={req.clanId}
                      avatarUri={req.avatarUri}
                      size={AVATAR_SIZE}
                      iconScale={PROFILE_ICON_SCALE}
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.requestMid}>
                  <TouchableOpacity
                    onPress={() => onPressProfile(req.requesterId, req.username)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.actionText} numberOfLines={2}>
                      <Text style={styles.username}>@{username}</Text>
                      {' '}
                      <Text>quiere seguirte</Text>
                    </Text>
                    <Text style={styles.timestamp}>{relativeTime(req.createdAt)}</Text>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => onAccept(req.requesterId)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.acceptBtnText}>{busy ? '…' : 'Aceptar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => onReject(req.requesterId)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.rejectBtnText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b0b0f',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#0b0b0f',
    fontSize: 12,
    fontWeight: '800',
  },
  expandedList: {
    paddingBottom: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  requestRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  requestMid: {
    flex: 1,
    gap: 10,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 19,
  },
  timestamp: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(199,255,2,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,255,2,0.45)',
  },
  acceptBtnText: {
    color: '#c7ff02',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rejectBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
