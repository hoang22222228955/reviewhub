import styles from './HeroIllustration.module.css'

export default function HeroIllustration() {
  return (
    <div className={styles.stage}>
      <div className={styles.desktop}>
        <div className={styles.screen}>
          <div className={styles.topbar}>
            <span className={styles.brand}>learnio.</span>
            <div className={styles.search}>Tìm nội dung bạn cần...</div>
          </div>
          <div className={styles.hero}>
            <div>
              <h3>Make your review data better</h3>
              <p>Public review, private review, moderation và quota được gom vào một hệ thống rõ ràng hơn.</p>
            </div>
            <div className={styles.avatarBlock}>
              <div className={styles.avatarGlow} />
              <div className={styles.avatarCard}>
                <div className={styles.miniBadge}>700k+</div>
                <div className={styles.metric}>Đối tác tin dùng</div>
              </div>
            </div>
          </div>
          <div className={styles.brandStrip}>
            <span>Google</span>
            <span>Harvard</span>
            <span>Microsoft</span>
            <span>Stanford</span>
          </div>
        </div>
        <div className={styles.desktopBase} />
      </div>

      <div className={styles.laptop}>
        <div className={styles.screen}>
          <div className={styles.topbarSmall}>
            <span className={styles.brand}>ReviewHub</span>
            <span className={styles.search}>API · Dashboard · Pricing</span>
          </div>
          <div className={styles.laptopHero}>
            <div className={styles.laptopTitle}>Make your dashboard cleaner</div>
            <div className={styles.chartCard}>
              <svg viewBox="0 0 220 100" className={styles.chartSvg}>
                <path d="M10 72 C40 18, 78 88, 112 42 S176 22, 210 48" fill="none" stroke="#7b5cff" strokeWidth="4" strokeLinecap="round" />
                <path d="M10 76 C46 50, 80 26, 112 58 S176 76, 210 36" fill="none" stroke="#4db8c7" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tablet}>
        <div className={styles.tabletScreen}>
          <div className={styles.tabletCard} />
          <div className={styles.tabletCard} />
        </div>
      </div>

      <div className={styles.phone}>
        <div className={styles.phoneScreen}>
          <div className={styles.phoneBar} />
          <div className={styles.phoneTile} />
          <div className={styles.phoneTile} />
          <div className={styles.phoneTile} />
        </div>
      </div>
    </div>
  )
}
