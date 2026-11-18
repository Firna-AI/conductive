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
import { siteIcons } from '../../components/marketing/siteIcons'
import { paths } from '../../paths'
import { FeaturePicture, homeSections, pictureIsWide, tintStyle } from './parts'
import styles from './SkyHomeScreen.module.css'
import rows from './SkyRows.module.css'

/** The width of a stage on a desktop, less its padding, in px. */
const stageRoom = 560

/**
 * Variation A of the home page, "Sky": the painted blue field of the
 * approved share card behind the hero and the last call, the app rising
 * out of the field, and the features in rows that alternate their sides,
 * each on a stage in its own tint.
 */
export function SkyHomeScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  return (
    <SitePage viewport={viewport}>
      <div className={classes(styles.page, mobile && styles.mobile)}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{productSummary.heroTitle}</h1>
            <p className={styles.heroText}>{productSummary.heroText}</p>
            <SiteActions stack={mobile} to={paths.signIn} />
          </div>
          <div className={styles.heroPicture}>
            <FeaturePicture picture="hero" viewport={viewport} />
          </div>
        </section>
        <div className={rows.rows} id="features">
          {features.map((feature, index) => (
            <FeatureRow
              feature={feature}
              flip={index % 2 === 1}
              index={index}
              key={feature.picture}
              viewport={viewport}
            />
          ))}
          <FeatureRow
            feature={macAppSection}
            flip={features.length % 2 === 1}
            id="mac-app"
            index={features.length}
            viewport={viewport}
          >
            <MacDownloads
              downloads={macAppSection.downloads}
              requirement={macAppSection.requirement}
              viewport={viewport}
            />
          </FeatureRow>
        </div>
        <section className={styles.more}>
          <div className={styles.moreIntro}>
            <span className={styles.label}>{homeSections.gridLabel}</span>
            <h2 className={styles.moreTitle}>{homeSections.gridTitle}</h2>
            <p className={styles.moreText}>{homeSections.gridText}</p>
          </div>
          <ul className={styles.grid}>
            {smallerFeatures.map((item, index) => {
              const Icon = siteIcons[item.icon]
              return (
                <li
                  className={styles.item}
                  key={item.title}
                  style={tintStyle(index)}
                >
                  <span className={styles.itemIcon}>
                    <Icon aria-hidden size={18} />
                  </span>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <p className={styles.itemText}>{item.text}</p>
                </li>
              )
            })}
          </ul>
        </section>
        <section className={styles.closing}>
          <h2 className={styles.closingTitle}>{homeSections.closingTitle}</h2>
          <p className={styles.closingText}>{waitlistText}</p>
          <SiteActions stack={mobile} to={paths.signIn} />
        </section>
      </div>
    </SitePage>
  )
}

/** One feature: the words on one side, its picture on a tinted stage. */
function FeatureRow(props: {
  feature: Feature
  index: number
  flip: boolean
  viewport: Viewport
  id?: string
  children?: ReactNode
}) {
  const { feature, viewport } = props
  const wide =
    viewport !== 'mobile' && pictureIsWide(feature.picture, viewport, stageRoom)
  return (
    <section
      className={classes(rows.row, props.flip && rows.flip)}
      id={props.id}
      style={tintStyle(props.index)}
    >
      <div className={rows.copy}>
        <span className={rows.label}>
          <span aria-hidden className={rows.dot} />
          {feature.label}
        </span>
        <h2 className={rows.title}>{feature.title}</h2>
        <p className={rows.text}>{feature.text}</p>
        {props.children}
      </div>
      <div
        className={classes(
          rows.stage,
          feature.bleed && rows.tall,
          wide && rows.wide,
        )}
      >
        <FeaturePicture picture={feature.picture} viewport={viewport} />
      </div>
    </section>
  )
}
