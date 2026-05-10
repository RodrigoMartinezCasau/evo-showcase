import styles from './evo-landing.module.css'
import { WELCOME_STARS } from './welcomeStarfield'

export default function Home() {
  return (
    <main className={styles.root}>
      <div className={styles.starfield} aria-hidden>
        {WELCOME_STARS.map((s, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${s.leftPct}%`,
              top: `${s.topPct}%`,
              width: s.sizePx,
              height: s.sizePx,
              animationDelay: `${s.delayMs}ms`,
            }}
          />
        ))}
      </div>

      <div className={styles.inner}>
        <div className={styles.starLogoWrap}>
          {/* Mismo asset que la app: estrellasPrincipales/17.svg (sin clan) */}
          <img
            className={styles.starLogo}
            src="/evo-entry-star.svg"
            alt=""
            width={120}
            height={120}
            fetchPriority="high"
          />
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.evoTitle}>EVO</h1>
          <p className={styles.tagline}>Diseñado y desarrollado por evoconn</p>
        </div>
      </div>

      <p className={styles.footer}>evoconn.com</p>
    </main>
  )
}
