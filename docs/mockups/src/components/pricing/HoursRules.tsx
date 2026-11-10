import type { Viewport } from '@mokly/mokly'
import { pricingPageCopy } from '../../../../../src/marketing/pricing'
import { classes } from '../common/classes'
import { SectionIntro } from '../marketing/SectionIntro'
import styles from './HoursRules.module.css'

/**
 * How cloud hours count: the size of each cloud computer, then each rule
 * under a neutral hairline. A desktop shows the rules in two columns, and a
 * phone stacks them.
 */
export function HoursRules(props: { viewport: Viewport }) {
  const copy = pricingPageCopy.hours
  return (
    <section
      className={classes(
        styles.section,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <SectionIntro
        label={copy.label}
        text={copy.text}
        title={copy.title}
        viewport={props.viewport}
      />
      <ul className={styles.rules}>
        {copy.rules.map((rule) => (
          <li className={styles.rule} key={rule.title}>
            <h3 className={styles.title}>{rule.title}</h3>
            <p className={styles.text}>{rule.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
