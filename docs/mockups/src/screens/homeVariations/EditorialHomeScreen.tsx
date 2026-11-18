import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { waitlistText } from '../../../../../src/marketing/access-copy'
import {
  features,
  macAppSection,
  productSummary,
  smallerFeatures,
  type Feature,
} from '../../../../../src/marketing/features'
import { classes } from '../../components/common/classes'
import { MacDownloads } from '../../components/marketing/MacDownloads'
import { SiteActions } from '../../components/marketing/SiteActions'
import { SitePage } from '../../components/marketing/SitePage'
import { paths } from '../../paths'
import { FeaturePicture, featureNumber, homeSections } from './parts'
import styles from './EditorialHomeScreen.module.css'
import bands from './EditorialBands.module.css'

/** Every section of the features, the Mac app last. */
const allFeatures: readonly Feature[] = [...features, macAppSection]

/**
 * Variation D of the home page, "Editorial": a very large headline, the
 * app tilted back under it, a line of the feature names, then one band
 * for each feature across the full width. Every second band turns to the
 * ink colour, so the page changes its light as it scrolls.
 */
export function EditorialHomeScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const total = featureNumber(allFeatures.length - 1)
  return (
    <SitePage viewport={viewport}>
      <div className={classes(styles.page, mobile && styles.mobile)}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>{productSummary.heroTitle}</h1>
          <div className={styles.heroRow}>
            <p className={styles.heroText}>{productSummary.heroText}</p>
            <SiteActions stack={mobile} to={paths.signIn} />
          </div>
          <div className={styles.heroPicture}>
            <div className={styles.tilt}>
              <FeaturePicture picture="hero" viewport={viewport} />
            </div>
          </div>
        </section>
        <p aria-hidden className={styles.names}>
          {allFeatures.map((feature) => (
            <span className={styles.name} key={feature.picture}>
              {feature.label}
            </span>
          ))}
        </p>
        <div className={bands.bands} id="features">
          {allFeatures.map((feature, index) => (
            <Band
              feature={feature}
              id={feature === macAppSection ? 'mac-app' : undefined}
              index={index}
              inverted={index % 2 === 0}
              key={feature.picture}
              total={total}
              viewport={viewport}
            >
              {feature === macAppSection ? (
                <MacDownloads
                  downloads={macAppSection.downloads}
                  requirement={macAppSection.requirement}
                  viewport={viewport}
                />
              ) : null}
            </Band>
          ))}
        </div>
        <section className={styles.more}>
          <h2 className={styles.moreTitle}>{homeSections.gridTitle}</h2>
          <ol className={styles.moreList}>
            {smallerFeatures.map((item, index) => (
              <li className={styles.moreItem} key={item.title}>
                <span className={styles.moreNumber}>
                  {featureNumber(index)}
                </span>
                <h3 className={styles.moreItemTitle}>{item.title}</h3>
                <p className={styles.moreItemText}>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.closing}>
          <h2 className={styles.closingTitle}>{homeSections.closingTitle}</h2>
          <div className={styles.heroRow}>
            <p className={styles.closingText}>{waitlistText}</p>
            <SiteActions stack={mobile} to={paths.signIn} />
          </div>
        </section>
      </div>
    </SitePage>
  )
}

/** One feature as a band across the page, its picture at the foot. */
function Band(props: {
  feature: Feature
  index: number
  total: string
  inverted: boolean
  viewport: Viewport
  id?: string
  children?: ReactNode
}) {
  const { feature } = props
  return (
    <section
      className={classes(bands.band, props.inverted && bands.inverted)}
      id={props.id}
    >
      <div className={bands.head}>
        <span className={bands.count}>
          {featureNumber(props.index)} / {props.total}
          <span className={bands.label}>{feature.label}</span>
        </span>
        <div className={bands.copy}>
          <h2 className={bands.title}>{feature.title}</h2>
          <p className={bands.text}>{feature.text}</p>
          {props.children}
        </div>
      </div>
      <div className={classes(bands.picture, feature.bleed && bands.tall)}>
        <FeaturePicture picture={feature.picture} viewport={props.viewport} />
      </div>
    </section>
  )
}
