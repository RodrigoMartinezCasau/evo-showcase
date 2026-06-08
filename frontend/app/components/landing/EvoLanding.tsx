'use client';

import React from 'react';
import {
  getClans,
  IOS_URL,
  ANDROID_URL,
  type Clan,
  type Lang,
} from '../../lib/clans';
import { getDict, type LandingDict } from '../../lib/landing-i18n';

const STORAGE_KEY = 'evo-lang';

// ──────────────────────────────────────────────────────────────────
// Language context
// ──────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  dict: LandingDict;
  clans: Clan[];
}
const LangContext = React.createContext<LangCtx | null>(null);
function useLang(): LangCtx {
  const ctx = React.useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside <LangContext>');
  return ctx;
}

// ──────────────────────────────────────────────────────────────────
// Reveal-on-scroll wrapper
// ──────────────────────────────────────────────────────────────────
interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}

function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  style = {},
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const TagAny = Tag as any;
  return (
    <TagAny
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 1100ms cubic-bezier(.16,.84,.3,1) ${delay}ms, transform 1200ms cubic-bezier(.16,.84,.3,1) ${delay}ms`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </TagAny>
  );
}

// ──────────────────────────────────────────────────────────────────
// Warp-perspective starfield (canvas, slow + cinematic)
// ──────────────────────────────────────────────────────────────────
function WarpStarfield() {
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
    type Star = {
      a: number;
      d: number;
      v: number;
      b: number;
      tw: number;
      color: string;
    };
    let stars: Star[] = [];
    const NUM = 220;

    const reset = (s: Partial<Star>, hard = false) => {
      s.a = Math.random() * Math.PI * 2;
      s.d = hard ? Math.random() * 0.6 + 0.04 : 0.02 + Math.random() * 0.05;
      s.v = 0.0008 + Math.random() * 0.0022;
      s.b = 0.4 + Math.random() * 0.6;
      s.tw = Math.random() * Math.PI * 2;
      const tint = Math.random();
      s.color =
        tint < 0.06
          ? 'rgba(199,255,2,'
          : tint < 0.12
            ? 'rgba(165,120,255,'
            : 'rgba(255,255,255,';
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
  return <canvas ref={canvasRef} className="evo-warp" aria-hidden="true" />;
}

// ──────────────────────────────────────────────────────────────────
// Perspective grid (hero background)
// ──────────────────────────────────────────────────────────────────
function PerspectiveGrid() {
  const N = 20;
  const lines = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2);
  const rings = [0.18, 0.32, 0.5, 0.72, 1.0, 1.35];
  return (
    <svg
      className="evo-perspective"
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="evo-grid-fade" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <mask id="evo-grid-mask">
          <rect
            x="-100"
            y="-100"
            width="200"
            height="200"
            fill="url(#evo-grid-fade)"
          />
        </mask>
      </defs>
      <g
        mask="url(#evo-grid-mask)"
        stroke="#ffffff"
        strokeWidth="0.08"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {lines.map((a, i) => (
          <line
            key={'r' + i}
            x1="0"
            y1="0"
            x2={Math.cos(a) * 200}
            y2={Math.sin(a) * 200}
            opacity="0.5"
          />
        ))}
        {rings.map((r, i) => (
          <ellipse
            key={'e' + i}
            cx="0"
            cy="0"
            rx={r * 120}
            ry={r * 70}
            opacity="0.35"
          />
        ))}
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────
// Eyebrow with the Evo star mark
// ──────────────────────────────────────────────────────────────────
function Eyebrow({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`evo-eyebrow${centered ? ' centered' : ''}`}>
      <img
        src="/landing/eyebrow-mark.svg"
        alt=""
        className="evo-eyebrow-mark"
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Language toggle (button in nav)
// ──────────────────────────────────────────────────────────────────
function LangToggle() {
  const { lang, setLang, dict } = useLang();
  const next: Lang = lang === 'es' ? 'en' : 'es';
  return (
    <button
      type="button"
      className="evo-lang-toggle"
      onClick={() => setLang(next)}
      aria-label={`Switch language to ${dict.langToggle.other}`}
      title={`${dict.langToggle.label} → ${dict.langToggle.other}`}
    >
      <span className="evo-lang-toggle-current">{dict.langToggle.label}</span>
      <span className="evo-lang-toggle-sep">/</span>
      <span className="evo-lang-toggle-other">{dict.langToggle.other}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────────
function Hero() {
  const { dict } = useLang();
  const [y, setY] = React.useState(0);
  React.useEffect(() => {
    const on = () => setY(window.scrollY);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const py = Math.max(-120, -y * 0.18);
  return (
    <section className="evo-hero" data-screen-label="01 Hero">
      <div className="evo-hero-bg">
        <WarpStarfield />
        <PerspectiveGrid />
        <div className="evo-hero-vignette" />
      </div>

      <header className="evo-topnav">
        <a href="#" className="evo-wordmark" aria-label="Evo">
          <img
            src="/landing/star-main.svg"
            width={22}
            height={22}
            alt=""
            className="evo-wordmark-star"
          />
          <span>Evo</span>
        </a>
        <nav className="evo-topnav-links" aria-label="Primary">
          <a href={IOS_URL} target="_blank" rel="noopener noreferrer">
            {dict.nav.ios}
          </a>
          <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer">
            {dict.nav.android}
          </a>
          <a href="/tutoriales">{dict.nav.info}</a>
          <a href="#footer">{dict.nav.contact}</a>
          <LangToggle />
        </nav>
      </header>

      <div className="evo-hero-content">
        <div className="evo-hero-copy">
          <h1 className="evo-hero-title">Evo</h1>
          <p className="evo-hero-desc">{dict.hero.desc}</p>
          <div className="evo-hero-ctas">
            <a
              className="evo-boxbtn evo-boxbtn-ghost"
              href={IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.hero.downloadIos}
            </a>
            <a
              className="evo-boxbtn evo-boxbtn-solid"
              href={ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.hero.downloadAndroid}
            </a>
          </div>
          <a className="evo-hero-learn" href="#clans">
            {dict.hero.learn}
          </a>
        </div>

        <div
          className="evo-hero-phones"
          style={{ transform: `translateY(${py * 0.5}px)` }}
        >
          <img
            src="/landing/phone-left.png"
            alt=""
            className="evo-phone evo-phone-left"
            draggable={false}
          />
          <img
            src="/landing/phone-center.png"
            alt=""
            className="evo-phone evo-phone-center"
            draggable={false}
          />
          <img
            src="/landing/phone-right.png"
            alt=""
            className="evo-phone evo-phone-right"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// How to join (iOS / Android cards)
// ──────────────────────────────────────────────────────────────────
const AppleGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const AndroidGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6.5 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm11 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm.13-5.62 1.45-2.51a.32.32 0 0 0-.55-.32l-1.47 2.54A10.3 10.3 0 0 0 12 7.1c-1.8 0-3.49.34-5.06 1l-1.47-2.55a.32.32 0 0 0-.55.32l1.45 2.51A8.34 8.34 0 0 0 2.3 15h19.4a8.34 8.34 0 0 0-4.07-6.62z" />
  </svg>
);

function DownloadSection() {
  const { dict } = useLang();
  type CardProps = {
    icon: React.ComponentType;
    platform: string;
    store: string;
    steps: string[];
    href: string;
  };
  const Card = ({ icon: Icon, platform, store, steps, href }: CardProps) => (
    <Reveal className="evo-join-card">
      <div className="evo-join-head">
        <div className="evo-join-icon" aria-hidden="true">
          <Icon />
        </div>
        <div>
          <div className="evo-join-platform">{platform}</div>
          <div className="evo-join-store">{store}</div>
        </div>
      </div>
      <ol className="evo-join-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="evo-join-step-i">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <a
        className="evo-join-cta"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {dict.join.getOn(platform)}
      </a>
    </Reveal>
  );

  return (
    <section
      className="evo-section"
      id="join"
      data-screen-label="02 How to join"
    >
      <Reveal>
        <Eyebrow>{dict.join.eyebrow}</Eyebrow>
        <h2 className="evo-h2">{dict.join.title}</h2>
        <p className="evo-lede">{dict.join.lede}</p>
      </Reveal>
      <div className="evo-join-grid">
        <Card
          icon={AppleGlyph}
          platform="iOS"
          store={dict.join.iosStore}
          href={IOS_URL}
          steps={[...dict.join.iosSteps]}
        />
        <Card
          icon={AndroidGlyph}
          platform="Android"
          store={dict.join.androidStore}
          href={ANDROID_URL}
          steps={[...dict.join.androidSteps]}
        />
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Clan grid (intro + 8 cards)
// ──────────────────────────────────────────────────────────────────
function ClanCard({ clan, idx }: { clan: Clan; idx: number }) {
  const { dict } = useLang();
  return (
    <Reveal
      delay={idx * 60}
      className="evo-clan-card"
      style={{ ['--c' as any]: clan.color }}
    >
      <a href={`#${clan.id}`} className="evo-clan-card-a">
        <div className="evo-clan-card-top">
          <div className="evo-clan-card-num">
            {String(idx + 1).padStart(2, '0')}
          </div>
          <div className="evo-clan-card-dot" />
        </div>
        <div className="evo-clan-card-name">{clan.name}</div>
        <div className="evo-clan-card-meta">
          <span>{clan.animal}</span>
          <span className="evo-clan-card-sep">·</span>
          <span>{clan.country}</span>
        </div>
        <div className="evo-clan-card-foot">
          <span className="evo-clan-card-color">{clan.colorName}</span>
          <span className="evo-clan-card-learn">
            {dict.clansIntro.learnMore}
          </span>
        </div>
      </a>
    </Reveal>
  );
}

function ClanGridSection() {
  const { dict, clans } = useLang();
  return (
    <section
      className="evo-section evo-section-starfield"
      id="clans"
      data-screen-label="03 Clans intro"
    >
      <div className="evo-section-bg" aria-hidden="true">
        <WarpStarfield />
        <div className="evo-section-bg-vignette" />
      </div>
      <div className="evo-section-inner">
        <Reveal>
          <Eyebrow>{dict.clansIntro.eyebrow}</Eyebrow>
          <h2 className="evo-h2">
            {dict.clansIntro.titleA}
            <br />
            <em>{dict.clansIntro.titleB}</em>
          </h2>
          <p className="evo-lede">{dict.clansIntro.lede}</p>
        </Reveal>
        <div className="evo-clan-grid">
          {clans.map((c, i) => (
            <ClanCard key={c.id} clan={c} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Clan detail (×8) with Origin → map hover
// ──────────────────────────────────────────────────────────────────
function ClanDetail({ clan, idx }: { clan: Clan; idx: number }) {
  const { dict } = useLang();
  const reversed = idx % 2 === 1;
  const [mapOpen, setMapOpen] = React.useState(false);
  const showMap = () => setMapOpen(true);
  const hideMap = () => setMapOpen(false);
  const toggleMap = () => setMapOpen((v) => !v);

  return (
    <section
      className={`evo-clan-detail${reversed ? ' reversed' : ''}`}
      id={clan.id}
      data-screen-label={`04.${idx + 1} ${clan.name}`}
      style={{ ['--c' as any]: clan.color }}
    >
      <div className="evo-clan-detail-glow" />

      <div className="evo-clan-detail-inner">
        <Reveal className="evo-clan-detail-header">
          <div className="evo-clan-detail-eye">
            <span className="evo-clan-detail-num">
              {String(idx + 1).padStart(2, '0')} / 08
            </span>
            <span className="evo-clan-detail-dot" />
            <span>
              {dict.clanDetail.clanLabel} {String(idx + 1).padStart(2, '0')}
            </span>
          </div>
          <h3 className="evo-clan-detail-name">{clan.name}</h3>
          <div className="evo-clan-detail-headertag">
            <span className="evo-swatch" />
            <span>{clan.colorName}</span>
            <span className="evo-clan-detail-headersep">—</span>
            <span>{clan.animal}</span>
            <span className="evo-clan-detail-headersep">—</span>
            <span>{clan.origin}</span>
          </div>
        </Reveal>

        <div className="evo-clan-detail-main">
          <Reveal className="evo-clan-detail-text">
            <p className="evo-clan-detail-desc">{clan.long}</p>
            <dl className="evo-clan-detail-spec">
              <div>
                <dt className="k">{dict.clanDetail.specs.animal}</dt>
                <dd className="v">{clan.animal}</dd>
              </div>
              <div
                className="evo-clan-detail-spec-origin"
                onMouseEnter={showMap}
                onMouseLeave={hideMap}
                onFocus={showMap}
                onBlur={hideMap}
                onClick={toggleMap}
                tabIndex={0}
                role="button"
                aria-pressed={mapOpen}
                aria-label={dict.clanDetail.revealMap(clan.country)}
              >
                <dt className="k">{dict.clanDetail.specs.origin}</dt>
                <dd className="v">
                  <span>{clan.origin}</span>
                  <span className="evo-clan-detail-origin-hint">
                    {mapOpen ? '−' : '+'} {dict.clanDetail.mapHint}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="k">{dict.clanDetail.specs.color}</dt>
                <dd className="v">
                  <span className="evo-swatch" />
                  {clan.colorName}
                </dd>
              </div>
            </dl>

            <div className="evo-clan-detail-blocks">
              <Reveal className="evo-clan-block">
                <div className="evo-clan-block-h">
                  {dict.clanDetail.blockThinks}
                </div>
                <p className="evo-clan-block-body">{clan.thinks}</p>
              </Reveal>

              <Reveal delay={80} className="evo-clan-block">
                <div className="evo-clan-block-h">
                  {dict.clanDetail.blockSymbol}
                </div>
                <p className="evo-clan-block-body">{clan.whyAnimal}</p>
                <p className="evo-clan-block-body evo-clan-block-body-dim">
                  {clan.whyColor}
                </p>
              </Reveal>
            </div>

            <Reveal className="evo-clan-detail-motto">
              <span className="quote">“</span>
              <span className="evo-clan-detail-motto-text">
                {clan.quote.replace(/^[“«]|[”»]$/g, '')}
              </span>
              <span className="evo-clan-detail-motto-author">
                — {clan.author}
              </span>
            </Reveal>
          </Reveal>

          <Reveal delay={120} className="evo-clan-detail-art">
            <div
              className={`evo-clan-map${mapOpen ? ' is-open' : ''} ${reversed ? 'from-left' : 'from-right'}`}
              style={{ ['--map-scale' as any]: clan.mapScale ?? 1 }}
              aria-hidden="true"
            >
              <img src={clan.map} alt="" loading="lazy" />
            </div>
            <div className="evo-clan-art-frame">
              <img
                src={clan.img}
                alt={clan.animal}
                className="evo-clan-art-img"
                loading="lazy"
              />
              <div className="evo-clan-art-label">
                <span>{clan.animal.toUpperCase()}</span>
                <span>{clan.country.toUpperCase()}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ClanDetailsAll() {
  const { clans } = useLang();
  return (
    <div className="evo-clan-details">
      <div className="evo-clan-details-bg" aria-hidden="true">
        <WarpStarfield />
      </div>
      <div className="evo-clan-details-list">
        {clans.map((c, i) => (
          <ClanDetail key={c.id} clan={c} idx={i} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// App preview (6 phone-screen tiles)
// ──────────────────────────────────────────────────────────────────
function AppPreviewSection() {
  const { dict } = useLang();
  return (
    <section className="evo-section" id="app" data-screen-label="05 App preview">
      <Reveal>
        <Eyebrow>{dict.appPreview.eyebrow}</Eyebrow>
        <h2 className="evo-h2">{dict.appPreview.title}</h2>
        <p className="evo-lede">{dict.appPreview.lede}</p>
      </Reveal>
      <div className="evo-app-grid">
        {dict.appPreview.tiles.map((t, i) => (
          <Reveal key={t.name} delay={i * 50} className="evo-app-tile">
            <div className="evo-app-screen">
              <img
                src={t.src}
                alt={t.name}
                className="evo-app-screen-img"
                loading="lazy"
              />
            </div>
            <div className="evo-app-tile-meta">
              <div className="evo-app-tile-name">{t.name}</div>
              <div className="evo-app-tile-desc">{t.desc}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Final CTA
// ──────────────────────────────────────────────────────────────────
function FinalCTA() {
  const { dict } = useLang();
  return (
    <section className="evo-cta-final" data-screen-label="06 Final CTA">
      <div className="evo-cta-final-inner">
        <Reveal>
          <Eyebrow centered>{dict.finalCta.eyebrow}</Eyebrow>
          <h2 className="evo-h1-final">
            {dict.finalCta.titleA}
            <br />
            <em>{dict.finalCta.titleB}</em>
          </h2>
          <div className="evo-cta-row centered">
            <a
              className="evo-btn evo-btn-primary"
              href={IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.finalCta.iosCta}
            </a>
            <a
              className="evo-btn evo-btn-primary"
              href={ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.finalCta.androidCta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────────────────────────
function Footer() {
  const { dict } = useLang();
  return (
    <footer className="evo-footer" id="footer" data-screen-label="07 Footer">
      <div className="evo-footer-inner">
        <div className="evo-footer-brand">
          <div className="evo-wordmark">
            <img src="/landing/star-main.svg" width={16} height={16} alt="" />
            <span>EVO</span>
          </div>
          <div className="evo-footer-tag">{dict.footer.tag}</div>
        </div>
        <div className="evo-footer-cols">
          <div>
            <div className="evo-footer-col-h">{dict.footer.connect}</div>
            <ul>
              <li>
                <a
                  href="https://www.instagram.com/evo.clans"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/4yJqaGxjA8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@evo.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/EvoConn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  X / Twitter
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="evo-footer-col-h">{dict.footer.appCol}</div>
            <ul>
              <li>
                <a href={IOS_URL} target="_blank" rel="noopener noreferrer">
                  {dict.footer.iosLink}
                </a>
              </li>
              <li>
                <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer">
                  {dict.footer.androidLink}
                </a>
              </li>
              <li>
                <a href="#clans">{dict.footer.clansLink}</a>
              </li>
              <li>
                <a href="#app">{dict.footer.features}</a>
              </li>
            </ul>
          </div>
          <div>
            <div className="evo-footer-col-h">{dict.footer.legal}</div>
            <ul>
              <li>
                <a href="/privacy">{dict.footer.privacy}</a>
              </li>
              <li>
                <a href="/terms">{dict.footer.terms}</a>
              </li>
              <li>
                <a href="/cookies">{dict.footer.cookies}</a>
              </li>
              <li>
                <a href="mailto:hello@evoconn.com">{dict.footer.contact}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="evo-footer-bottom">
        <span>{dict.footer.bottomLeft}</span>
        <span>{dict.footer.bottomRight}</span>
      </div>
    </footer>
  );
}

// ──────────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────────
export default function EvoLanding({ initialLang }: { initialLang: Lang }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang);

  // Restore stored preference once on mount (overrides server-detected default
  // only if user has explicitly chosen something different in a prior session).
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && (stored === 'en' || stored === 'es') && stored !== lang) {
        setLangState(stored);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect in <html lang=…> for accessibility / SEO when the user toggles.
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = React.useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      dict: getDict(lang),
      clans: getClans(lang),
    }),
    [lang, setLang],
  );

  return (
    <LangContext.Provider value={value}>
      <div className="evo-root">
        <Hero />
        <DownloadSection />
        <ClanGridSection />
        <ClanDetailsAll />
        <AppPreviewSection />
        <FinalCTA />
        <Footer />
      </div>
    </LangContext.Provider>
  );
}
