import { ArrowUpRight, Minus, Plus } from 'lucide-react'
import {
  count,
  poolHours,
  seatPrice,
  upgradeSeats,
} from '../../fixtures/billing'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton, IconButton } from '../common/actions'
import { CheckField } from '../common/CheckField'
import { ScreenLink } from '../common/ScreenLink'
import { LegalLink } from '../marketing/LegalLinks'
import { Facts } from '../settings/Facts'
import { Section } from '../settings/Section'
import styles from './Billing.module.css'

/** The number of seats, with a step down and a step up. */
function SeatStepper(props: { seats: number }) {
  return (
    <div className={styles.seats}>
      <span className={styles.seatsLabel} id="seats-label">
        Seats
      </span>
      <div
        aria-labelledby="seats-label"
        className={styles.stepper}
        role="group"
      >
        <IconButton icon={Minus} label="One seat less" />
        <output className={styles.seatCount}>{props.seats}</output>
        <IconButton icon={Plus} label="One seat more" />
      </div>
    </div>
  )
}

/**
 * The upgrade of the free org to Team: the seats, what they cost and
 * include, and the agreement to the terms. Continue to payment hands off to
 * Stripe Checkout, which comes back to the billing tab when the payment is
 * done.
 */
export function UpgradeSection() {
  const seats = upgradeSeats
  const org = orgs.firna
  return (
    <Section
      actions={
        <>
          <ScreenLink asChild to={paths.billingFree}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.upgraded}>
            <ActionButton icon={ArrowUpRight} tone="primary">
              Continue to payment
            </ActionButton>
          </ScreenLink>
        </>
      }
      description="Buy a seat for each member, you included. You can change the seats later."
      title={`Upgrade ${org.name} to Team`}
    >
      <SeatStepper seats={seats} />
      <Facts
        items={[
          {
            label: 'Price',
            value: `$${seats * seatPrice} a month, $${seatPrice} a seat`,
          },
          {
            label: 'Compute',
            value: `About ${count(poolHours(seats))} hours a month`,
          },
          { label: 'More use', value: 'Cost plus 10%' },
          { label: 'Tax', value: 'Added at payment' },
        ]}
        label="Team"
      />
      <CheckField checked id="upgrade-terms">
        I agree to the <LegalLink page="Terms" /> and the{' '}
        <LegalLink page="Refunds and cancellation" /> policy.
      </CheckField>
      <p className={styles.line}>
        You pay on Stripe, and then come back to this page.
      </p>
    </Section>
  )
}
