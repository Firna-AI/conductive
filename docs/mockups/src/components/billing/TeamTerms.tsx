import { count, poolHours, seatPrice } from '../../fixtures/billing'
import { CheckField } from '../common/CheckField'
import { LegalLink } from '../marketing/LegalLinks'
import { Facts } from '../settings/Facts'
import styles from './Billing.module.css'

/**
 * What Team costs and includes for an org with `members` members, the
 * agreement to the terms, and the note on the hand-off to Stripe Checkout.
 * `after` says where the payment returns to.
 */
export function TeamTerms(props: { members: number; after: string }) {
  const { members } = props
  const people = members === 1 ? 'member' : 'members'
  return (
    <>
      <Facts
        items={[
          {
            label: 'Price',
            value: `${members} ${people} × $${seatPrice} = $${members * seatPrice} a month`,
          },
          {
            label: 'Compute',
            value: `About ${count(poolHours(members))} hours a month`,
          },
          { label: 'More use', value: 'Cost plus 10%' },
          { label: 'Tax', value: 'Added at payment' },
        ]}
        label="Team"
      />
      <CheckField checked id="team-terms">
        I agree to the <LegalLink page="Terms" /> and the{' '}
        <LegalLink page="Refunds and cancellation" /> policy.
      </CheckField>
      <p className={styles.line}>You pay on Stripe, and then {props.after}.</p>
    </>
  )
}
