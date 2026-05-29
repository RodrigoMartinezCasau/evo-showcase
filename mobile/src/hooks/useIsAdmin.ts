import { useEffect, useState } from 'react';
import { useAuth } from '../../mobile/lib/AuthContext';
import { checkIsAdmin } from '@evoconn/services/supabaseSocial';

/**
 * useIsAdmin — ¿la cuenta autenticada tiene privilegios de administrador?
 *
 * Consulta la RPC `is_admin` una vez por usuario y cachea el resultado en
 * memoria para no repetir la llamada en cada pantalla. El gating real vive en
 * la base de datos (las RPCs admin_delete_* revalidan), así que este flag solo
 * controla la VISIBILIDAD de los botones de admin.
 */
let adminCache: { userId: string; value: boolean } | null = null;

export function useIsAdmin(): boolean {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [isAdmin, setIsAdmin] = useState<boolean>(
    adminCache && adminCache.userId === userId ? adminCache.value : false,
  );

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    if (adminCache && adminCache.userId === userId) {
      setIsAdmin(adminCache.value);
      return;
    }
    let cancelled = false;
    void checkIsAdmin().then((value) => {
      adminCache = { userId, value };
      if (!cancelled) setIsAdmin(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}
