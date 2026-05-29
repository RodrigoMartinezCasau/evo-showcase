import React, { useCallback, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildProfileShareMessage } from '@evoconn/utils/appShareLinks';
import { useRouter } from 'expo-router';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useAuth } from '../../../mobile/lib/AuthContext';
import { insertReport, isRealUserId, adminDeleteUser } from '@evoconn/services/supabaseSocial';
import { useIsAdmin } from '@evoconn/hooks/useIsAdmin';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import {
  EvoActionSheetModal,
  EvoConfirmModal,
  EvoInfoModal,
} from '@evoconn/components/shared/EvoActionSheetModal';
import {
  THREE_DOTS_OFFSET_X,
  THREE_DOTS_OFFSET_Y,
  THREE_DOTS_SIZE,
} from '@evoconn/constants/otherProfileLayout';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  avatarUri?: string | null;
};

export const ProfileMoreMenu = React.memo(function ProfileMoreMenu({
  userId,
  username,
  clanId,
  avatarUri,
}: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const isAdmin = useIsAdmin();
  const { isFollowing, toggleFollow } = useFollowState();
  const { recordBlockUser } = useRecommendationTaste();
  const { block } = useBlockedUsers();
  const following = isFollowing(userId);

  const [mainOpen, setMainOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAvatarOpen, setReportAvatarOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [adminDeleteOpen, setAdminDeleteOpen] = useState(false);
  const [info, setInfo] = useState<{ title: string; message?: string } | null>(null);

  const isOwnProfile =
    (session?.user?.id != null && session.user.id === userId) || mockCurrentUser.id === userId;

  const openInfo = useCallback((title: string, message?: string) => {
    setInfo({ title, message });
  }, []);

  const confirmAdminDeleteUser = useCallback(async () => {
    try {
      await adminDeleteUser(userId);
      openInfo('Cuenta eliminada', `${username} se ha eliminado por completo.`);
      if (router.canGoBack()) router.back();
      else router.navigate('/(tabs)');
    } catch (e) {
      openInfo('No se pudo eliminar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    }
  }, [userId, username, router, openInfo]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: buildProfileShareMessage(username, userId),
      });
    } catch {
      /* cancel */
    }
  }, [userId, username]);

  const confirmBlock = useCallback(async () => {
    if (!session?.user) {
      openInfo('Sesión requerida', 'Inicia sesión para bloquear usuarios.');
      return;
    }
    if (following) toggleFollow(userId);
    await block(userId).catch(console.error);
    recordBlockUser(userId, clanId ?? null);
    openInfo('Usuario bloqueado', 'Ya no verás su contenido. Puedes desbloquear desde Ajustes.');
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)');
  }, [
    session,
    following,
    userId,
    clanId,
    toggleFollow,
    block,
    recordBlockUser,
    router,
    openInfo,
  ]);

  const submitReport = useCallback(
    async (reason: string) => {
      if (!session?.user) {
        openInfo('Sesión requerida', 'Inicia sesión para denunciar.');
        return;
      }
      if (isRealUserId(session.user.id) && isRealUserId(userId)) {
        await insertReport({
          reporterId: session.user.id,
          targetType: 'user',
          targetId: userId,
          reason,
        }).catch(console.error);
      }
      openInfo('Denuncia enviada', 'Gracias. Revisaremos el perfil.');
    },
    [session, userId, openInfo],
  );

  const submitAvatarReport = useCallback(
    async (reason: string) => {
      if (!session?.user) {
        openInfo('Sesión requerida', 'Inicia sesión para denunciar.');
        return;
      }
      if (isRealUserId(session.user.id) && isRealUserId(userId)) {
        await insertReport({
          reporterId: session.user.id,
          targetType: 'user',
          targetId: userId,
          reason: `Foto de perfil: ${reason}`,
        }).catch(console.error);
      }
      openInfo('Denuncia enviada', 'Gracias. Revisaremos la foto de perfil.');
    },
    [session, userId, openInfo],
  );

  const pad = 8;
  const hit = Math.max(44, THREE_DOTS_SIZE + pad * 2);

  if (isOwnProfile) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setMainOpen(true)}
        hitSlop={12}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Más opciones"
        style={[
          styles.button,
          {
            minWidth: hit,
            minHeight: hit,
            transform: [
              { translateX: THREE_DOTS_OFFSET_X },
              { translateY: THREE_DOTS_OFFSET_Y },
            ],
          },
        ]}
      >
        <Ionicons name="ellipsis-vertical" size={THREE_DOTS_SIZE} color="#FFFFFF" />
      </TouchableOpacity>

      <EvoActionSheetModal
        visible={mainOpen}
        onClose={() => setMainOpen(false)}
        title={username}
        options={[
          {
            key: 'follow',
            label: following ? 'Dejar de seguir' : 'Seguir',
            onPress: () => toggleFollow(userId),
          },
          {
            key: 'share',
            label: 'Compartir perfil',
            onPress: () => void handleShare(),
          },
          ...(avatarUri
            ? [{
                key: 'reportAvatar',
                label: 'Denunciar foto de perfil',
                destructive: true,
                onPress: () => setReportAvatarOpen(true),
              }]
            : []),
          {
            key: 'report',
            label: 'Denunciar perfil',
            destructive: true,
            onPress: () => setReportOpen(true),
          },
          {
            key: 'block',
            label: 'Bloquear usuario',
            destructive: true,
            onPress: () => setBlockOpen(true),
          },
          ...(isAdmin
            ? [{
                key: 'adminDeleteUser',
                label: 'Eliminar cuenta (admin)',
                destructive: true,
                onPress: () => setAdminDeleteOpen(true),
              }]
            : []),
        ]}
      />

      <EvoActionSheetModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Denunciar perfil"
        options={[
          {
            key: 'r1',
            label: 'Contenido inapropiado',
            onPress: () => void submitReport('Contenido inapropiado (perfil)'),
          },
          {
            key: 'r2',
            label: 'Spam o suplantación',
            onPress: () => void submitReport('Spam o suplantación (perfil)'),
          },
          {
            key: 'r3',
            label: 'Acoso o abuso',
            onPress: () => void submitReport('Acoso o abuso (perfil)'),
          },
        ]}
      />

      <EvoActionSheetModal
        visible={reportAvatarOpen}
        onClose={() => setReportAvatarOpen(false)}
        title="Denunciar foto de perfil"
        options={[
          {
            key: 'a1',
            label: 'Imagen inapropiada o explícita',
            onPress: () => void submitAvatarReport('Imagen inapropiada o explícita'),
          },
          {
            key: 'a2',
            label: 'Suplantación de identidad',
            onPress: () => void submitAvatarReport('Suplantación de identidad'),
          },
          {
            key: 'a3',
            label: 'Odio o discriminación',
            onPress: () => void submitAvatarReport('Odio o discriminación'),
          },
        ]}
      />

      <EvoConfirmModal
        visible={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Bloquear usuario"
        message={`¿Bloquear a ${username}? Dejarás de ver su contenido.`}
        confirmLabel="Bloquear"
        destructive
        onConfirm={() => void confirmBlock()}
      />

      <EvoConfirmModal
        visible={adminDeleteOpen}
        onClose={() => setAdminDeleteOpen(false)}
        title="Eliminar cuenta (admin)"
        message={`¿Eliminar por completo la cuenta de ${username}? Se borrarán su perfil, publicaciones y comentarios. Esta acción NO se puede deshacer.`}
        confirmLabel="Eliminar cuenta"
        destructive
        onConfirm={() => void confirmAdminDeleteUser()}
      />

      <EvoInfoModal
        visible={info != null}
        onClose={() => setInfo(null)}
        title={info?.title ?? ''}
        message={info?.message}
      />
    </>
  );
});

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
