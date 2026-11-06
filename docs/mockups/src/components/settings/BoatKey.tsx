import { Input } from '@firna/ui/input'
import { productName } from '../../brand'
import {
  boatKeyPreset,
  boatPages,
  type SavedBoatKey,
} from '../../fixtures/boatKey'
import { people } from '../../fixtures/members'
import { noop } from '../../noop'
import { ExternalLink } from '../common/ExternalLink'
import { useControlSizes } from '../common/touch'
import styles from './BoatKey.module.css'

/** How to make a key. The key screen and Get started both say it. */
export const makeKeyText = `Make an API key in the Boat dashboard with the ${boatKeyPreset} preset, limited to one environment.`

/** The pages of Boat where an admin signs up and makes a key. */
export function BoatLinks() {
  return (
    <div className={styles.links}>
      <ExternalLink href={boatPages.signUp}>Create a Boat account</ExternalLink>
      <ExternalLink href={boatPages.dashboard}>
        Open the Boat dashboard
      </ExternalLink>
    </div>
  )
}

/**
 * The field for a Boat API key. A pasted key shows only as dots, and a key
 * that failed its test marks the field.
 */
export function BoatKeyField(props: { value?: string; invalid?: boolean }) {
  const { field } = useControlSizes()
  return (
    <Input
      autoComplete="off"
      hint={`${productName} tests the key when you save it, and never shows it again.`}
      invalid={props.invalid}
      label="API key"
      onChangeText={noop}
      placeholder="Paste the key"
      secureTextEntry
      size={field}
      value={props.value ?? ''}
    />
  )
}

/**
 * What the app knows of a saved key: its last four characters, the one
 * environment that it is limited to, and who added it when.
 */
export function BoatKeyDetails(props: { saved: SavedBoatKey }) {
  const { saved } = props
  const rows = [
    { term: 'Key', value: `•••• ${saved.tail}`, mono: true },
    { term: 'Environment', value: saved.environment, mono: true },
    {
      term: 'Added',
      value: `${saved.added}, by ${people[saved.addedBy].name}`,
      mono: false,
    },
  ]
  return (
    <dl className={styles.details}>
      {rows.map((row) => (
        <div className={styles.row} key={row.term}>
          <dt className={styles.term}>{row.term}</dt>
          <dd className={row.mono ? styles.mono : styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
