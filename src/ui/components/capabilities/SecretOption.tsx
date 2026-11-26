import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { classes } from '../common/classes'
import check from '../common/CheckOption.module.css'
import { aboutSecret, secretsPartWords } from './capabilitiesCopy'
import shared from './Capabilities.module.css'
import styles from './SecretOption.module.css'

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
 * The description shows only in the info box of the info icon after the
 * name, never in the row. The box floats under the icon, over the rows
 * below it. A mouse on the icon shows it, and a press, also a tap on a
 * phone, keeps it open until a second press. A secret without a
 * description shows no icon, because the box would be empty. The app and
 * the mockups draw each row with this.
 */
export function SecretOption(props: {
  secret: ListedSecret
  checked: boolean
  disabled: boolean
  change: (on: boolean) => void
  /** A press keeps the info box open. */
  infoOpen: boolean
  toggleInfo: () => void
}) {
  const { secret } = props
  const info = useId()
  const tag = useId()
  const [hover, setHover] = useState(false)
  const described = secret.description.trim() !== ''
  const shown = described && (props.infoOpen || hover)
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
          <span className={shared.secretName}>{secret.name}</span>
        </label>
        {described ? (
          <button
            aria-controls={shown ? info : undefined}
            aria-expanded={props.infoOpen}
            aria-label={aboutSecret(secret.name)}
            className={styles.info}
            onClick={props.toggleInfo}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setHover(true)
            }}
            onPointerLeave={() => setHover(false)}
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
      {shown ? (
        <span className={styles.infoBox} id={info} role="tooltip">
          {secret.description}
        </span>
      ) : null}
    </div>
  )
}
