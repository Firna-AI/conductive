import { useId } from 'react'
import { Switch } from '@firna/ui/switch'
import { useControlSizes } from '../../ui/components/common/touch'
import styles from '../../ui/components/settings/SkillsTrust.module.css'
import {
  skillsTrustCopy as copy,
  trustHint,
} from '../../ui/components/settings/skillsTrustCopy'
import { ExternalLink } from '../ui/links'

/**
 * The switch "Trust this skills repository" of an admin, under the
 * Repository field, as the mockups draw it. Its hint says what the value
 * does, then how long a running cloud computer keeps the choice that it
 * started with, then links to the guide in a new tab. `replaced` marks a
 * field that names another repository than the saved one, so the hint of
 * off first says that a new repository starts untrusted. The switch
 * changes only the draft, which Save repository saves with the field.
 */
export function TrustSwitch(props: {
  trusted: boolean
  replaced: boolean
  onChange: (trusted: boolean) => void
}) {
  const labelId = useId()
  const { field } = useControlSizes()
  const hint = trustHint({ trusted: props.trusted, replaced: props.replaced })
  return (
    <div className={styles.trust}>
      <div className={styles.text}>
        <span className={styles.label} id={labelId}>
          {copy.label}
        </span>
        <p className={styles.hint}>
          {hint} {copy.note}{' '}
          <ExternalLink href={copy.guide.href}>{copy.guide.label}</ExternalLink>
        </p>
      </div>
      <span className={styles.control}>
        <Switch
          aria-labelledby={labelId}
          onValueChange={props.onChange}
          size={field}
          value={props.trusted}
        />
      </span>
    </div>
  )
}
