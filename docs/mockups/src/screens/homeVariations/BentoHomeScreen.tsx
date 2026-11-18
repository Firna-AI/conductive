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
import { FeaturePicture, homeSections, tintStyle } from './parts'
import styles from './BentoHomeScreen.module.css'
import tiles from './BentoTiles.module.css'

/**
 * The width of each feature tile on a desktop, in columns of twelve. The
 * wide and the narrow tiles change sides on each row.
 */
const spans = [7, 5, 5, 7, 7, 5] as const

/**
 * Variation B of the home page, "Bento": a large centred headline with the
 * last word in a gradient and a glow behind the app, then every feature as
 * a tile of a grid, with its picture running off the edge of the tile.
 */
export function BentoHomeScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const words = productSummary.heroTitle.split(' ')
  const lastWord = words.pop()
  return (
    <SitePage viewport={viewport}>
      <div className={classes(styles.page, mobile && styles.mobile)}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            {words.join(' ')} <span className={styles.accent}>{lastWord}</span>
          </h1>
          <p className={styles.heroText}>{productSummary.heroText}</p>
          <SiteActions stack={mobile} to={paths.signIn} />
          <div className={styles.heroPicture}>
            <FeaturePicture picture="hero" viewport={viewport} />
          </div>
        </section>
        <div className={tiles.grid} id="features">
          {features.map((feature, index) => (
            <Tile
              feature={feature}
              index={index}
              key={feature.picture}
              span={spans[index % spans.length]}
              viewport={viewport}
            />
          ))}
          <Tile
            feature={macAppSection}
            id="mac-app"
            index={features.length}
            span={12}
            viewport={viewport}
          >
            <MacDownloads
              downloads={macAppSection.downloads}
              requirement={macAppSection.requirement}
              viewport={viewport}
            />
          </Tile>
        </div>
        <section className={styles.more}>
          <h2 className={styles.moreTitle}>
            {homeSections.gridTitle}{' '}
            <span className={styles.moreText}>{homeSections.gridText}</span>
          </h2>
          <ul className={styles.moreGrid}>
            {smallerFeatures.map((item, index) => {
              const Icon = siteIcons[item.icon]
              return (
                <li
                  className={styles.moreItem}
                  key={item.title}
                  style={tintStyle(index)}
                >
                  <Icon aria-hidden className={styles.moreIcon} size={18} />
                  <h3 className={styles.moreItemTitle}>{item.title}</h3>
                  <p className={styles.moreItemText}>{item.text}</p>
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

/** One feature as a tile: the words at the top, the picture under them. */
function Tile(props: {
  feature: Feature
  index: number
  span: number
  viewport: Viewport
  id?: string
  children?: ReactNode
}) {
  const { feature } = props
  const wide = props.span === 12
  // A phone has one column, so its tiles take no span.
  const gridColumn =
    props.viewport === 'mobile' ? undefined : `span ${props.span}`
  return (
    <section
      className={classes(
        tiles.tile,
        wide && tiles.wide,
        feature.bleed && tiles.phone,
      )}
      id={props.id}
      style={{ ...tintStyle(props.index), gridColumn }}
    >
      <div className={tiles.copy}>
        <span className={tiles.label}>{feature.label}</span>
        <h2 className={tiles.title}>{feature.title}</h2>
        <p className={tiles.text}>{feature.text}</p>
        {props.children}
      </div>
      <div className={tiles.picture}>
        <FeaturePicture picture={feature.picture} viewport={props.viewport} />
      </div>
    </section>
  )
}
