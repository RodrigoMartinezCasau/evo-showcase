/**
 * EvoAudioBridge
 * ──────────────
 * A 1×1 invisible WebView that synthesizes star sparkle sounds
 * via the Web Audio API. Mounted at app root; receives a ref from
 * EvoPreferencesContext so `playSound()` can inject JS into it.
 *
 * Sounds are synthesized (no external audio files needed):
 *  · star-tap-1   2100→1500 Hz short sparkle   (clan reveal 1st tap)
 *  · star-tap-2   2600→1900 Hz short sparkle   (clan reveal 2nd tap)
 *  · star-tap-3   3300→2500 Hz short sparkle   (clan reveal 3rd tap)
 *  · star-shine   ascending 4-note chime chord (post-streak / reveal)
 *  · star-soft    1800→1300 Hz soft chime       (AI output / publish)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { useEvoPreferences } from '@evoconn/hooks/EvoPreferencesContext';

// ─── Synthesizer HTML ─────────────────────────────────────────────────────────
const AUDIO_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
<script>
(function(){
  var _ctx = null;
  function getCtx() {
    try {
      if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (_ctx.state === 'suspended') _ctx.resume();
      return _ctx;
    } catch(e) { return null; }
  }

  /* Short sparkle: single sine with freq glide + fast decay */
  function beep(freq, endFreq, dur, vol) {
    var ctx = getCtx(); if (!ctx) return;
    var now = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(endFreq, now + dur * 0.65);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
  }

  /* Star shine: ascending 4-note chord */
  function shine() {
    var ctx = getCtx(); if (!ctx) return;
    var now = ctx.currentTime;
    [1760, 2217, 2637, 3136].forEach(function(f, i) {
      var t = now + i * 0.06;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.38);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.start(t); o.stop(t + 0.48);
    });
  }

  window.playEvoSound = function(name) {
    try {
      var map = {
        'star-tap-1': function(){ beep(2100, 1500, 0.16, 0.22); },
        'star-tap-2': function(){ beep(2600, 1900, 0.16, 0.22); },
        'star-tap-3': function(){ beep(3300, 2500, 0.16, 0.22); },
        'star-shine': shine,
        'star-soft':  function(){ beep(1800, 1300, 0.22, 0.18); },
      };
      if (map[name]) map[name]();
    } catch(e) {}
  };
})();
</script>
</body>
</html>`;

// ─── Component ────────────────────────────────────────────────────────────────
export function EvoAudioBridge() {
  const { audioWebViewRef } = useEvoPreferences();

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <WebView
        ref={audioWebViewRef as React.Ref<WebView>}
        source={{ html: AUDIO_HTML }}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Zero-size container — clips the WebView so it occupies no visible space
  wrapper: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  webview: {
    width: 200,
    height: 200,
    opacity: 0,
  },
});
