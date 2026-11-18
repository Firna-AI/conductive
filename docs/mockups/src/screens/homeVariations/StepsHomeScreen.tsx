import type { Viewport } from '@mokly/mokly'
import { waitlistText } from '../../../../../src/marketing/access-copy'
import {
  features,
  macAppSection,
  productSummary,
  smallerFeatures,
} from '../../../../../src/marketing/features'
import { classes } from '../../components/common/classes'
import { MacDownloads } from '../../components/marketing/MacDownloads'
import { SiteActions } from '../../components/marketing/SiteActions'
import { SitePage } from '../../components/marketing/SitePage'
import { siteIcons } from '../../components/marketing/siteIcons'
import { paths } from '../../paths'
import { FeaturePicture, featureNumber, homeSections, tintStyle } from './parts'
import styles from './StepsHomeScreen.module.css'
import cards from './StepsCards.module.css'
import steps from './StepsList.module.css'

/** The features that follow one task, from the message to the merge. */
const taskFeatures = features.slice(0, 4)

/** The features around the task: the org, the phone, and the Mac app. */
const [orgFeature, phoneFeature] = features.slice(4)

/**
 * Variation C of the home page, "Steps": the page follows one task. The
 * hero lists the steps beside the headline. The first four features are
 * numbered steps on a rail, and the org, the phone, and the Mac app follow
 * as the places around the work.
 */
export function StepsHomeScreen(props: { viewport: Viewport }) {
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
          <ol className={styles.outline}>
            {taskFeatures.map((feature, index) => (
              <li
                className={styles.outlineItem}
                key={feature.picture}
                style={tintStyle(index)}
              >
                <span className={styles.outlineNumber}>
                  {featureNumber(index)}
                </span>
                <span className={styles.outlineLabel}>{feature.label}</span>
                <span className={styles.outlineTitle}>{feature.title}</span>
              </li>
            ))}
          </ol>
        </section>
        <div className={styles.heroPicture}>
          <FeaturePicture picture="hero" viewport={viewport} />
        </div>
        <ol className={steps.list} id="features">
          {taskFeatures.map((feature, index) => (
            <li
              className={steps.step}
              key={feature.picture}
              style={tintStyle(index)}
            >
              <div className={steps.marker}>
                <span className={steps.number}>{featureNumber(index)}</span>
                <span className={steps.label}>{feature.label}</span>
              </div>
              <div className={steps.body}>
                <h2 className={steps.title}>{feature.title}</h2>
                <p className={steps.text}>{feature.text}</p>
                <div className={steps.stage}>
                  <FeaturePicture
                    picture={feature.picture}
                    viewport={viewport}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <section className={cards.around}>
          <div className={classes(cards.card, cards.orgCard)}>
            <div className={cards.cardCopy}>
              <span className={cards.cardLabel}>{orgFeature.label}</span>
              <h2 className={cards.cardTitle}>{orgFeature.title}</h2>
              <p className={cards.cardText}>{orgFeature.text}</p>
            </div>
            <div className={cards.cardPicture}>
              <FeaturePicture
                picture={orgFeature.picture}
                viewport={viewport}
              />
            </div>
          </div>
          <div className={classes(cards.card, cards.phoneCard)}>
            <div className={cards.cardCopy}>
              <span className={cards.cardLabel}>{phoneFeature.label}</span>
              <h2 className={cards.cardTitle}>{phoneFeature.title}</h2>
              <p className={cards.cardText}>{phoneFeature.text}</p>
            </div>
            <div className={cards.cardPicture}>
              <FeaturePicture
                picture={phoneFeature.picture}
                viewport={viewport}
              />
            </div>
          </div>
          <div className={classes(cards.card, cards.macCard)} id="mac-app">
            <div className={cards.cardCopy}>
              <span className={cards.cardLabel}>{macAppSection.label}</span>
              <h2 className={cards.cardTitle}>{macAppSection.title}</h2>
              <p className={cards.cardText}>{macAppSection.text}</p>
              <MacDownloads
                downloads={macAppSection.downloads}
                requirement={macAppSection.requirement}
                viewport={viewport}
              />
            </div>
            <div className={cards.cardPicture}>
              <FeaturePicture
                picture={macAppSection.picture}
                viewport={viewport}
              />
            </div>
          </div>
        </section>
        <section className={styles.more}>
          <h2 className={styles.moreTitle}>{homeSections.gridTitle}</h2>
          <ul className={styles.moreList}>
            {smallerFeatures.map((item) => {
              const Icon = siteIcons[item.icon]
              return (
                <li className={styles.moreItem} key={item.title}>
                  <Icon aria-hidden className={styles.moreIcon} size={18} />
                  <div>
                    <h3 className={styles.moreItemTitle}>{item.title}</h3>
                    <p className={styles.moreItemText}>{item.text}</p>
                  </div>
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
