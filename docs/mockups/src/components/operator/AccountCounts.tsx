import { Section } from '../settings/Section'
import { providerWords } from './providerCopy'
import styles from './AccountCounts.module.css'

/** A provider account by its ID, and its orgs, deleted orgs included. */
export type AccountOrgs = { id: string; orgs: number }

/**
 * The orgs on each provider account, in the order of the settings of the
 * Worker. Each row names the account by its ID. The counts add up to the
 * orgs of the Overview. It imports no fixture, so the app uses it too.
 */
export function AccountCounts(props: { accounts: readonly AccountOrgs[] }) {
  return (
    <Section title={providerWords.counts}>
      <ul aria-label={providerWords.counts} className={styles.list}>
        {props.accounts.map((item) => (
          <li className={styles.row} key={item.id}>
            <span className={styles.account}>{item.id}</span>
            <span className={styles.count}>
              {item.orgs.toLocaleString('en')}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
