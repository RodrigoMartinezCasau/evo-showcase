'use client';

// EVO — Centro de tutoriales (página "Info").
// Recreación 1:1 del prototipo de diseño (design_handoff_tutoriales) dentro del
// codebase Next.js, con i18n ES/EN y selector de idioma en la barra superior.

import React from 'react';
import type { Lang } from '../lib/clans';
import {
  getTutDict,
  type TutChrome,
  type TutDict,
  type Tutorial,
  type SlideSpec,
  type TutorialSlideSpec,
  type CompSlideSpec,
  type WidgetSlideSpec,
} from './i18n';
import './tutoriales.css';

const STORAGE_KEY = 'evo-lang';
const T = '/tutoriales/'; // base pública de los assets

const TS_CLAN_ICONS = [
  'animal-stoic.png',
  'animal-rationalist.png',
  'animal-scientist.png',
  'animal-humanist.png',
  'animal-transcendentalist.png',
  'animal-existentialist.png',
  'animal-realist.png',
  'animal-nihilist.png',
].map((f) => T + f);

// ──────────────────────────────────────────────────────────────────
// fondo: warp starfield con estrellas fugaces (idéntico a la landing)
// ──────────────────────────────────────────────────────────────────
function TutStarfield() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type Star = { a: number; d: number; v: number; b: number; tw: number; color: string };
    let stars: Star[] = [];
    const NUM = 260;

    const reset = (s: Partial<Star>, hard = false) => {
      s.a = Math.random() * Math.PI * 2;
      s.d = hard ? Math.random() * 0.6 + 0.04 : 0.02 + Math.random() * 0.05;
      s.v = 0.0008 + Math.random() * 0.0022;
      s.b = 0.4 + Math.random() * 0.6;
      s.tw = Math.random() * Math.PI * 2;
      const tint = Math.random();
      s.color = tint < 0.06 ? 'rgba(199,255,2,' : tint < 0.12 ? 'rgba(165,120,255,' : 'rgba(255,255,255,';
    };
    const init = () => {
      stars = Array.from({ length: NUM }, () => {
        const s = {} as Star;
        reset(s, true);
        return s;
      });
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    init();
    window.addEventListener('resize', resize);

    let t0 = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - t0);
      t0 = t;
      ctx.fillStyle = 'rgba(5,5,7,0.18)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(cx, cy);
      for (const s of stars) {
        s.d += s.v * (1 + s.d * 3.2) * (dt / 16);
        if (s.d > 1.2) reset(s);
        const x = cx + Math.cos(s.a) * s.d * maxR;
        const y = cy + Math.sin(s.a) * s.d * maxR;
        if (x < -8 || y < -8 || x > w + 8 || y > h + 8) {
          reset(s);
          continue;
        }
        const size = 0.4 + s.d * 1.9;
        const tw = 0.7 + 0.3 * Math.sin(s.tw + t * 0.0015);
        const alpha = Math.min(0.95, s.b * tw * (0.15 + s.d * 0.95));
        ctx.fillStyle = s.color + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        if (s.d > 0.55) {
          const px = cx + Math.cos(s.a) * (s.d - 0.04) * maxR;
          const py = cy + Math.sin(s.a) * (s.d - 0.04) * maxR;
          ctx.strokeStyle = s.color + (alpha * 0.5).toFixed(3) + ')';
          ctx.lineWidth = size * 0.6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="tut-warp" aria-hidden="true" />;
}

// ──────────────────────────────────────────────────────────────────
// atmósfera dentro de los slides (estrellas estáticas + polvo)
// ──────────────────────────────────────────────────────────────────
function BPStarfield({ density = 1.0, seed = 7 }: { density?: number; seed?: number }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    let s = seed >>> 0;
    const rand = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const N = Math.floor(((W * H) / 2600) * density);
    const stars: { x: number; y: number; r: number; a: number; tw: number; ph: number; hue: string }[] = [];
    for (let i = 0; i < N; i++) {
      const r = Math.pow(rand(), 6);
      stars.push({
        x: rand() * W,
        y: rand() * H,
        r: 0.25 + r * 1.9,
        a: 0.25 + rand() * 0.75,
        tw: 0.35 + rand() * 0.9,
        ph: rand() * Math.PI * 2,
        hue: rand() < 0.08 ? (rand() < 0.5 ? 'lime' : 'purple') : 'white',
      });
    }

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const st of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * st.tw + st.ph);
        const a = st.a * tw;
        let col = `rgba(255,255,255,${a})`;
        if (st.hue === 'lime') col = `rgba(199,255,2,${a * 0.9})`;
        if (st.hue === 'purple') col = `rgba(176,140,255,${a * 0.9})`;
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (st.r > 1.4) {
          ctx.beginPath();
          ctx.fillStyle = col.replace(/[\d.]+\)$/, `${a * 0.18})`);
          ctx.arc(st.x, st.y, st.r * 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [density, seed]);
  return <canvas ref={ref} className="bp-stars" />;
}

function BPDust({ count = 20, seed = 31 }: { count?: number; seed?: number }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    let s = seed >>> 0;
    const rand = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const motes: { x: number; y: number; r: number; vx: number; vy: number; a: number; hue: string }[] = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        x: rand() * W,
        y: rand() * H,
        r: 1.2 + rand() * 3.0,
        vx: (rand() - 0.5) * 0.07,
        vy: -0.05 - rand() * 0.11,
        a: 0.09 + rand() * 0.18,
        hue: rand() < 0.55 ? 'purple' : 'lime',
      });
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = H + 10;
          m.x = rand() * W;
        }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;
        const col = m.hue === 'lime' ? `rgba(199,255,2,${m.a})` : `rgba(176,140,255,${m.a})`;
        const halo = m.hue === 'lime' ? `rgba(199,255,2,${m.a * 0.25})` : `rgba(176,140,255,${m.a * 0.25})`;
        ctx.beginPath();
        ctx.fillStyle = halo;
        ctx.arc(m.x, m.y, m.r * 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [count, seed]);
  return <canvas ref={ref} className="bp-dust" />;
}

// ── accent helpers (palabra lima) ──
function accentize(text: string, accent?: string): React.ReactNode {
  if (!accent) return text;
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="accent">{text.slice(idx, idx + accent.length)}</span>
      {text.slice(idx + accent.length)}
    </>
  );
}

function renderTitleWithAccent(lines: string[], accent: string | undefined, className: string) {
  return (
    <h2 className={className}>
      {lines.map((line, i) => {
        const tail = i < lines.length - 1 ? <br /> : null;
        if (!accent || !line.toLowerCase().includes(accent.toLowerCase())) {
          return (
            <React.Fragment key={i}>
              {line}
              {tail}
            </React.Fragment>
          );
        }
        const idx = line.toLowerCase().indexOf(accent.toLowerCase());
        return (
          <React.Fragment key={i}>
            {line.slice(0, idx)}
            <span className="accent">{line.slice(idx, idx + accent.length)}</span>
            {line.slice(idx + accent.length)}
            {tail}
          </React.Fragment>
        );
      })}
    </h2>
  );
}

function wgTitle(text: string, accent: string | undefined, className: string) {
  if (!accent || !text.toLowerCase().includes(accent.toLowerCase())) {
    return <h2 className={className}>{text}</h2>;
  }
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  return (
    <h2 className={className}>
      {text.slice(0, idx)}
      <span className="accent">{text.slice(idx, idx + accent.length)}</span>
      {text.slice(idx + accent.length)}
    </h2>
  );
}

const ATM = { density: 0.6, dust: 8, showTicks: true };

// ──────────────────────────────────────────────────────────────────
// ClanGrid (8 mascotas)
// ──────────────────────────────────────────────────────────────────
function ClanGrid() {
  return (
    <div className="ts-clangrid">
      {TS_CLAN_ICONS.map((src, i) => (
        <div key={i} className="ts-clan-medallion" style={{ animationDelay: `${(i % 4) * 0.4}s` }}>
          <img src={src} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// TutorialSlide
// ──────────────────────────────────────────────────────────────────
function TutorialSlide({ spec, chrome }: { spec: TutorialSlideSpec; chrome: TutChrome }) {
  const counter = String(spec.step).padStart(2, '0') + '/' + String(spec.count).padStart(2, '0');
  const starSrc = T + 'evo-star-poster.svg';
  const hasShot = spec.kind === 'step' && !!spec.stepShotSrc;
  return (
    <div className={`ts-slide is-11 kind-${spec.kind}${hasShot ? ' has-shot' : ''}`}>
      <BPStarfield density={ATM.density} seed={11} />
      <BPDust count={ATM.dust} seed={11 * 3 + 7} />
      <div className="ts-clan-glow" />
      <div className="ts-aura" />
      <div className="ts-vignette" />
      <div className="ts-grain" />
      <div className="ts-frame">
        <span className="ts-tick tl" />
        <span className="ts-tick tr" />
        <span className="ts-tick bl" />
        <span className="ts-tick br" />
      </div>

      <div className="ts-content">
        <div className="ts-head">
          <div className="ts-eyebrow">
            <span className="dot" />
            <span>{chrome.tutEyebrow}</span>
          </div>
          <div className="ts-counter">{counter}</div>
        </div>

        <div className="ts-body">
          {spec.kind === 'cover' && (
            <>
              {spec.coverVisual === 'image' ? (
                <div className="ts-cover-image">
                  <img src={T + spec.coverImageSrc} alt="" draggable={false} />
                </div>
              ) : spec.coverVisual === 'star' ? (
                <div className="ts-starwrap">
                  <div className="ts-crosshair" aria-hidden="true">
                    <span className="ring outer" />
                    <span className="ring" />
                  </div>
                  <img className="ts-star" src={starSrc} alt="" draggable={false} />
                </div>
              ) : (
                <ClanGrid />
              )}
              <p className="ts-cover-kicker">{spec.coverKicker}</p>
              {renderTitleWithAccent(spec.coverTitleLines ?? [], spec.coverAccentWord, 'ts-cover-title')}
            </>
          )}

          {spec.kind === 'step' &&
            (spec.stepShotSrc ? (
              <div className="ts-step-shot">
                <div className="ts-shot-frame">
                  <img src={T + spec.stepShotSrc} alt="" draggable={false} />
                </div>
                <div className="ts-shot-text">
                  <p className="ts-step-kicker">{spec.stepKicker}</p>
                  <h3 className="ts-step-headline">{spec.stepHeadline}</h3>
                  {spec.stepDesc && <p className="ts-step-desc">{spec.stepDesc}</p>}
                </div>
              </div>
            ) : (
              <>
                <p className="ts-step-kicker">{spec.stepKicker}</p>
                {spec.stepButtonSrc ? (
                  <div className="ts-step-button">
                    <span className="ts-step-button-hint">{chrome.buttonHint}</span>
                    <img src={T + spec.stepButtonSrc} alt="" draggable={false} />
                  </div>
                ) : (
                  <div className="ts-step-row">
                    <span className="ts-step-rule left" />
                    <h2 className="ts-step-num">{spec.stepNum}</h2>
                    <span className="ts-step-rule right" />
                  </div>
                )}
                <h3 className="ts-step-headline">{spec.stepHeadline}</h3>
                {spec.stepDesc && <p className="ts-step-desc">{spec.stepDesc}</p>}
              </>
            ))}

          {spec.kind === 'result' && (
            <>
              <div className="ts-starwrap">
                <div className="ts-crosshair" aria-hidden="true">
                  <span className="ring outer" />
                  <span className="ring" />
                </div>
                <img className="ts-star" src={starSrc} alt="" draggable={false} />
              </div>
              <p className="ts-result-eyebrow">
                <span className="check" aria-hidden="true" />
                <span>{spec.resultEyebrow}</span>
              </p>
              {renderTitleWithAccent(spec.resultTitleLines ?? [], spec.resultAccentWord, 'ts-result-title')}
              {spec.resultDesc && <p className="ts-result-desc">{spec.resultDesc}</p>}
            </>
          )}
        </div>

        <div className="ts-foot">
          {spec.kind === 'cover' ? (
            <span>
              {chrome.swipe}
              <span className="arrow">→</span>
            </span>
          ) : spec.kind === 'result' ? (
            <span>{chrome.outro}</span>
          ) : (
            <span>
              {chrome.continue}
              <span className="arrow">→</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// CompSlide
// ──────────────────────────────────────────────────────────────────
function CmpSeason({ day, month, time, label }: { day: string; month: string; time: string; label: string }) {
  return (
    <div className="cmp-season">
      <p className="cmp-caplabel">{label}</p>
      <div className="cmp-datecard">
        <span className="cmp-date-day">{day}</span>
        <span className="cmp-date-mon">{month}</span>
        <span className="cmp-date-time">{time}</span>
      </div>
    </div>
  );
}

function CmpDots({
  dots,
  vs,
}: {
  dots: NonNullable<CompSlideSpec['dots']>;
  vs: string;
}) {
  const makeDots = (on: number, total: number) =>
    Array.from({ length: total }, (_, i) => <span key={i} className={`cmp-dot ${i < on ? 'on' : 'off'}`} />);
  return (
    <div className="cmp-dots">
      <div className="cmp-clancard is-low">
        <p className="cmp-card-title">{dots.lowTitle}</p>
        <div className="cmp-dotgrid">{makeDots(dots.lowOn, dots.lowTotal)}</div>
        <p className="cmp-card-avg">
          <span className="lo">{dots.lowAvg}</span>
        </p>
      </div>
      <div className="cmp-dots-vs">{vs}</div>
      <div className="cmp-clancard is-high">
        <p className="cmp-card-title">{dots.highTitle}</p>
        <div className="cmp-dotgrid">{makeDots(dots.highOn, dots.highTotal)}</div>
        <p className="cmp-card-avg">
          <span className="hi">{dots.highAvg}</span>
        </p>
      </div>
    </div>
  );
}

function CompSlide({ spec, chrome }: { spec: CompSlideSpec; chrome: TutChrome }) {
  const counter = String(spec.step).padStart(2, '0') + '/' + String(spec.count).padStart(2, '0');
  const starSrc = T + 'evo-star-poster.svg';

  const renderStepVisual = () => {
    if (spec.visual === 'widget') {
      return (
        <div className="cmp-widget">
          <img src={T + spec.widgetSrc} alt="" draggable={false} />
        </div>
      );
    }
    if (spec.visual === 'season' && spec.season) {
      return <CmpSeason {...spec.season} label={chrome.seasonLabel} />;
    }
    if (spec.visual === 'reward') {
      return (
        <div className="ts-starwrap">
          <div className="ts-crosshair" aria-hidden="true">
            <span className="ring outer" />
            <span className="ring" />
          </div>
          <img className="ts-star" src={starSrc} alt="" draggable={false} />
        </div>
      );
    }
    return (
      <div className="ts-step-row">
        <span className="ts-step-rule left" />
        <h2 className="ts-step-num">{spec.stepNum}</h2>
        <span className="ts-step-rule right" />
      </div>
    );
  };

  return (
    <div className={`ts-slide is-11 kind-${spec.kind}`}>
      <BPStarfield density={ATM.density} seed={12} />
      <BPDust count={ATM.dust} seed={12 * 3 + 7} />
      <div className="ts-clan-glow" />
      <div className="ts-aura" />
      <div className="ts-vignette" />
      <div className="ts-grain" />
      <div className="ts-frame">
        <span className="ts-tick tl" />
        <span className="ts-tick tr" />
        <span className="ts-tick bl" />
        <span className="ts-tick br" />
      </div>

      <div className="ts-content">
        <div className="ts-head">
          <div className="ts-eyebrow">
            <span className="dot" />
            <span>{chrome.compEyebrow}</span>
          </div>
          <div className="ts-counter">{counter}</div>
        </div>

        <div className="ts-body">
          {spec.kind === 'cover' && (
            <>
              <ClanGrid />
              <p className="ts-cover-kicker">{spec.coverKicker}</p>
              {renderTitleWithAccent(spec.coverTitleLines ?? [], spec.coverAccentWord, 'ts-cover-title')}
            </>
          )}

          {spec.kind === 'step' && (
            <>
              <p className="ts-step-kicker">{spec.stepKicker}</p>
              {renderStepVisual()}
              <h3 className="ts-step-headline">{spec.stepHeadline}</h3>
              {spec.stepDesc && <p className="ts-step-desc">{spec.stepDesc}</p>}
            </>
          )}

          {spec.kind === 'note' && spec.dots && (
            <>
              <p className="ts-step-kicker">{spec.noteKicker}</p>
              <CmpDots dots={spec.dots} vs={chrome.vs} />
              <h3 className="ts-step-headline">{spec.noteHeadline}</h3>
              {spec.noteDesc && <p className="ts-step-desc">{spec.noteDesc}</p>}
            </>
          )}
        </div>

        <div className="ts-foot">
          {spec.kind === 'cover' ? (
            <span>
              {chrome.swipe}
              <span className="arrow">→</span>
            </span>
          ) : spec.kind === 'note' ? (
            <span>{chrome.outro}</span>
          ) : (
            <span>
              {chrome.continue}
              <span className="arrow">→</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// WidgetSlide
// ──────────────────────────────────────────────────────────────────
function WidgetSlide({ spec, chrome }: { spec: WidgetSlideSpec; chrome: TutChrome }) {
  const img = T + spec.img;
  const Mockup =
    spec.shot === 'card' ? (
      <div className="wg-shotcard" style={{ aspectRatio: String(spec.ratio ?? 0.5625) }}>
        <img src={img} alt={spec.title} draggable={false} />
      </div>
    ) : (
      <div className="wg-phone">
        <div className="wg-screen">
          <img className="wg-shot" src={img} alt={spec.title} draggable={false} />
        </div>
      </div>
    );

  return (
    <div className={`wg-slide is-11 kind-${spec.kind}`}>
      <BPStarfield density={ATM.density} seed={17} />
      <BPDust count={ATM.dust} seed={17 * 3 + 7} />
      <div className="wg-glow" />
      <div className="wg-aura" />
      <div className="wg-vignette" />
      <div className="wg-grain" />
      <div className="wg-ticks">
        <span className="wg-tick tl" />
        <span className="wg-tick tr" />
        <span className="wg-tick bl" />
        <span className="wg-tick br" />
      </div>

      <div className="wg-content">
        <div className="wg-progress">
          {Array.from({ length: spec.count }).map((_, i) => (
            <span key={i} className={`seg${i + 1 < spec.step ? ' done' : ''}${i + 1 === spec.step ? ' active' : ''}`} />
          ))}
        </div>

        <div className="wg-head">
          <span className="wg-eyebrow">
            <span className="dot" />
            {chrome.widgetEyebrow}
          </span>
          <span className="wg-counter">
            <b>{spec.step}</b>/{spec.count}
          </span>
        </div>

        <div className="wg-body">
          {spec.kind === 'cover' && (
            <>
              {Mockup}
              {spec.kicker && <p className="wg-kicker">{spec.kicker}</p>}
              {wgTitle(spec.title ?? '', spec.accent, 'wg-title')}
              {spec.note && (
                <span className="wg-note">
                  <span className="ndot" />
                  {spec.note}
                </span>
              )}
            </>
          )}

          {spec.kind === 'step' && (
            <>
              {spec.kicker && <p className="wg-kicker lime">{spec.kicker}</p>}
              {Mockup}
              {wgTitle(spec.title ?? '', spec.accent, 'wg-headline')}
              {spec.desc && <p className="wg-desc">{spec.desc}</p>}
            </>
          )}

          {spec.kind === 'final' && (
            <>
              {Mockup}
              <p className="wg-eyebrow-ok">
                <span className="check" />
                <span>{spec.kicker}</span>
              </p>
              {wgTitle(spec.title ?? '', spec.accent, 'wg-title')}
              {spec.desc && <p className="wg-desc">{spec.desc}</p>}
            </>
          )}
        </div>

        <div className="wg-foot">
          {spec.kind === 'cover' ? (
            <span>
              {chrome.swipe}
              <span className="arrow">→</span>
            </span>
          ) : spec.kind === 'final' ? (
            <span>{chrome.outro}</span>
          ) : (
            <span>
              {chrome.continue}
              <span className="arrow">→</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function renderSlide(spec: SlideSpec, chrome: TutChrome) {
  if (spec.type === 'tutorial') return <TutorialSlide spec={spec} chrome={chrome} />;
  if (spec.type === 'comp') return <CompSlide spec={spec} chrome={chrome} />;
  return <WidgetSlide spec={spec} chrome={chrome} />;
}

// ──────────────────────────────────────────────────────────────────
// carrusel
// ──────────────────────────────────────────────────────────────────
function useStageWidth() {
  const calc = () => {
    if (typeof window === 'undefined') return 460;
    const w = window.innerWidth;
    if (w > 900) return 460;
    return Math.max(240, Math.min(500, w - 44));
  };
  const [sw, setSw] = React.useState(calc);
  React.useEffect(() => {
    const on = () => setSw(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return sw;
}

function LazyMount({ minHeight, children }: { minHeight: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div ref={ref}>
      {seen ? children : <div style={{ height: minHeight, width: 'min(460px, calc(100vw - 44px))' }} />}
    </div>
  );
}

function Carousel({ slides, eyebrow }: { slides: React.ReactNode[]; eyebrow: string }) {
  const n = slides.length;
  const [i, setI] = React.useState(0);
  const sw = useStageWidth();
  const scale = sw / 540;
  const drag = React.useRef({ x: 0, active: false });

  const clamp = React.useCallback((v: number) => Math.max(0, Math.min(n - 1, v)), [n]);
  const go = React.useCallback((d: number) => setI((v) => clamp(v + d)), [clamp]);
  const jump = React.useCallback((v: number) => setI(clamp(v)), [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, active: true };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    drag.current.active = false;
    if (dx > 44) go(-1);
    else if (dx < -44) go(1);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  return (
    <div className="tut-carousel">
      <div
        className="tut-stage-wrap"
        style={{ ['--tut-slide-w' as string]: sw + 'px', ['--tut-slide-h' as string]: sw + 'px' } as React.CSSProperties}
      >
        <div
          className="tut-carousel-stage"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={eyebrow}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="tut-slide-scale" style={{ transform: `scale(${scale})` }}>
            <div className="tut-track" style={{ transform: `translateX(${-i * 100}%)` }}>
              {slides.map((s, idx) => (
                <div className="tut-cell" key={idx} aria-hidden={idx !== i}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button className="tut-arrow prev" onClick={() => go(-1)} disabled={i === 0} aria-label="Prev">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="tut-arrow next" onClick={() => go(1)} disabled={i === n - 1} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="tut-carousel-foot">
        <div className="tut-dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`tut-dot${idx === i ? ' is-on' : ''}`}
              onClick={() => jump(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
        <div className="tut-counter">
          <b>{String(i + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

function tutorialHaystack(t: Tutorial) {
  return [t.title, t.cat, t.desc, t.tags.join(' '), t.search].join(' ').toLowerCase();
}

function TutorialBlock({ t, idx, total, chrome }: { t: Tutorial; idx: number; total: number; chrome: TutChrome }) {
  const slides = React.useMemo(() => t.slides.map((s) => renderSlide(s, chrome)), [t, chrome]);
  return (
    <article className="tut-block" id={`tut-${t.id}`}>
      <div className="tut-block-text">
        <div className="tut-block-index">
          <span className="num">{String(idx + 1).padStart(2, '0')}</span>
          <span style={{ color: 'var(--tut-ink-3)' }}>/ {String(total).padStart(2, '0')}</span>
          <span className="cat">{t.cat}</span>
        </div>
        <h2 className="tut-block-title">{accentize(t.title, t.accent)}</h2>
        <p className="tut-block-desc">{t.desc}</p>
        <div className="tut-block-tags">
          {t.tags.map((tag) => (
            <span className="tut-block-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <LazyMount minHeight={520}>
        <Carousel slides={slides} eyebrow={t.title} />
      </LazyMount>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────
// raíz
// ──────────────────────────────────────────────────────────────────
export default function EvoTutoriales({ initialLang }: { initialLang: Lang }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && (stored === 'en' || stored === 'es') && stored !== lang) {
        setLangState(stored);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const dict: TutDict = React.useMemo(() => getTutDict(lang), [lang]);

  const [q, setQ] = React.useState('');
  const query = q.trim().toLowerCase();

  const tutorials = dict.tutorials;
  const matches = React.useMemo(() => {
    if (!query) return tutorials.map((t) => t.id);
    return tutorials
      .filter((t) => query.split(/\s+/).every((tok) => tutorialHaystack(t).includes(tok)))
      .map((t) => t.id);
  }, [query, tutorials]);

  const matchSet = new Set(matches);
  const count = matches.length;
  const nextLang: Lang = lang === 'es' ? 'en' : 'es';

  return (
    <>
      <div className="tut-bg" aria-hidden="true">
        <TutStarfield />
        <div className="tut-bg-aura" />
        <div className="tut-bg-vignette" />
      </div>
      <div className="tut-root">
        <nav className="tut-nav">
          <a className="tut-wordmark" href="/" aria-label="Evo">
            <img src={T + 'evo-star-main.svg'} alt="" />
            <span>Evo</span>
          </a>
          <div className="tut-nav-links">
            <a className="is-active" href="#top">
              {dict.nav.active}
            </a>
            <a className="hide-sm" href="/#join">
              {dict.nav.download}
            </a>
            <a className="tut-nav-back" href="/">
              <span className="arrow">←</span> {dict.nav.back}
            </a>
            <button
              type="button"
              className="tut-lang-toggle"
              onClick={() => setLang(nextLang)}
              aria-label={`Switch language to ${dict.langToggle.other}`}
              title={`${dict.langToggle.label} → ${dict.langToggle.other}`}
            >
              <span className="cur">{dict.langToggle.label}</span>
              <span className="sep">/</span>
              <span className="oth">{dict.langToggle.other}</span>
            </button>
          </div>
        </nav>

        <header className="tut-hero" id="top">
          <p className="tut-eyebrow">{dict.hero.eyebrow}</p>
          <h1 className="tut-hero-title">{accentize(dict.hero.title, dict.hero.titleAccent)}</h1>
          <p className="tut-hero-sub">{dict.hero.sub}</p>

          <div className="tut-search" role="search">
            <div className="tut-search-field">
              <svg className="tut-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="tut-search-input"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={dict.search.placeholder}
                aria-label={dict.search.ariaSearch}
              />
              {q && (
                <button className="tut-search-clear" onClick={() => setQ('')} aria-label={dict.search.clear}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="tut-chips">
              {dict.chips.map((c) => (
                <button
                  key={c}
                  className={`tut-chip${query === c.toLowerCase() ? ' is-on' : ''}`}
                  onClick={() => setQ((prev) => (prev.trim().toLowerCase() === c.toLowerCase() ? '' : c))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="tut-results-meta">
          <span className="line" />
          <span>
            {count} {count === 1 ? dict.meta.one : dict.meta.many}
            {query ? ` ${dict.meta.forWord} “${q.trim()}”` : ''}
          </span>
          <span className="line" />
        </div>

        {count > 0 ? (
          <main className="tut-list">
            {tutorials.map((t, idx) => (
              <div key={t.id} style={matchSet.has(t.id) ? undefined : { display: 'none' }}>
                <TutorialBlock t={t} idx={idx} total={tutorials.length} chrome={dict.chrome} />
              </div>
            ))}
          </main>
        ) : (
          <div className="tut-empty">
            <h2 className="tut-empty-title">{dict.empty.title(q.trim())}</h2>
            <p className="tut-empty-sub">{dict.empty.sub}</p>
            <button className="tut-empty-reset" onClick={() => setQ('')}>
              {dict.empty.reset}
            </button>
          </div>
        )}

        <footer className="tut-footer">
          <span>{dict.footer.left}</span>
          <a href="/">{dict.footer.right}</a>
        </footer>
      </div>
    </>
  );
}
