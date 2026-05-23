import { useEffect, useState } from 'react';
import { isFirstHundredUser } from '@evoconn/services/firstUsersBadge';

/**
 * True si el usuario pertenece a los 100 primeros perfiles por fecha de alta.
 */
export function useIsFirstHundredUser(userId: string | null | undefined): boolean {
  const [founding, setFounding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isFirstHundredUser(userId).then((ok) => {
      if (!cancelled) setFounding(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return founding;
}
