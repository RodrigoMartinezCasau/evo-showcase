/**
 * Interruptor único para los botones flotantes de debug en la app (dev).
 *
 * Cubre: selector de clan, preview/perfiles, editor de puntuaciones/stats,
 * panel del clasificador (⚗) y panel de animaciones.
 *
 * Solo tiene efecto si `__DEV__` es true; en builds de release no se montan.
 *
 * Cambia a `false` y guarda (⌘S) para ocultarlos mientras desarrollas.
 */
export const DEBUG_FLOATING_BUTTONS_ENABLED = true;
