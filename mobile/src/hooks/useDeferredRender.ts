/**
 * `useDeferredRender` — pinta la pantalla al instante (header / contenedor)
 * y difiere el cuerpo pesado hasta que la transición de navegación termine.
 *
 * Patrón Instagram / TikTok: la pantalla nueva entra en un frame, el contenido
 * aparece en el siguiente bloque idle. Mientras tanto se puede mostrar un
 * pequeño spinner con el color del clan.
 *
 * Uso típico:
 *
 *   const ready = useDeferredRender();
 *   return (
 *     <View>
 *       <AppTopBar ... />
 *       {!ready ? <ClanLoadingDot clanId={clanId} /> : <Body />}
 *     </View>
 *   );
 */
import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export function useDeferredRender(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    return () => handle.cancel();
  }, []);

  return ready;
}
