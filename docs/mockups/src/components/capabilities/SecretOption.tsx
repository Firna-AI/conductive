import { useId } from 'react'
import { Info } from 'lucide-react'
import { classes } from '../common/classes'
import check from '../common/CheckOption.module.css'
import { aboutSecret, secretsPartWords } from './capabilitiesCopy'
import styles from './Capabilities.module.css'

/** The parts of a secret that its row in the Capabilities control shows. */
type ListedSecret = {
  name: string
  description: string
  allAgents: boolean
}

/**
 * A secret of the org with its checkbox, which pre-approves it for the
 * workspace. A secret for all agents is always available, so its checkbox
 * stays checked and off, with the words "All agents".
 *
 * The description hides behind an info icon after the name. On a computer,
 * the icon shows the description on hover, as a native tooltip. A press,
 * also a tap on a phone, shows it under the name, and a second press hides
 * it. A secret without a description shows no icon. The app and the
 * mockups draw each row with this.
 */
export function SecretOption(props: {
  secret: ListedSecret
  checked: boolean
  disabled: boolean
  change: (on: boolean) => void
  /** The description shows under the name. */
  infoOpen: boolean
  toggleInfo: () => void
}) {
  const { secret } = props
  const info = useId()
  const tag = useId()
  const described = secret.description.trim() !== ''
  return (
    <div className={styles.secretOption}>
      <div className={styles.secretRow}>
        <label className={classes(check.option, styles.secretLabel)}>
          <input
            aria-describedby={secret.allAgents ? tag : undefined}
            aria-label={secret.name}
            checked={props.checked || secret.allAgents}
            className={check.box}
            disabled={secret.allAgents || props.disabled}
            onChange={(event) => props.change(event.currentTarget.checked)}
            type="checkbox"
          />
          <span className={styles.secretName}>{secret.name}</span>
        </label>
        {described ? (
          <button
            aria-controls={props.infoOpen ? info : undefined}
            aria-expanded={props.infoOpen}
            aria-label={aboutSecret(secret.name)}
            className={styles.info}
            onClick={props.toggleInfo}
            title={props.infoOpen ? undefined : secret.description}
            type="button"
          >
            <Info aria-hidden size={13} />
          </button>
        ) : null}
        {secret.allAgents ? (
          <span className={styles.tag} id={tag}>
            {secretsPartWords.allAgents}
          </span>
        ) : null}
      </div>
      {described && props.infoOpen ? (
        <p className={styles.secretInfo} id={info}>
          {secret.description}
        </p>
      ) : null}
    </div>
  )
}
