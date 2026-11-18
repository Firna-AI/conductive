import { useId } from 'react'
import { Switch } from '@firna/ui/switch'
import { noop } from '../../noop'
import { ExternalLink } from '../common/ExternalLink'
import { useControlSizes } from '../common/touch'
import type { Detail } from './DetailList'
import { skillsTrustCopy as copy, trustHint } from './skillsTrustCopy'
import styles from './SkillsTrust.module.css'

/**
 * The trust choice of the repository that the Skills section names: the
 * saved choice, and the choice of the form while an admin has not saved a
 * change. The section has a choice only while its field, or the saved
 * value of a read-only section, names a repository as owner/name.
 */
export type SkillsTrust = { saved: boolean; draft?: boolean }

/**
 * What the value does, then how long a running cloud computer keeps the
 * choice, then the link to the guide, in one muted paragraph.
 */
function TrustHint(props: { trusted: boolean; replaced: boolean }) {
  return (
    <p className={styles.hint}>
      {trustHint(props)} {copy.note}{' '}
      <ExternalLink href={copy.guide.href}>{copy.guide.label}</ExternalLink>
    </p>
  )
}

/**
 * The switch of an admin under the Repository field, at the end of its
 * label. It starts off for each new repository. `replaced` marks a field
 * that names another repository than the saved one, so the choice is off,
 * and its hint says why. Save repository saves the field and the switch
 * together.
 */
export function TrustSwitch(props: { trusted: boolean; replaced: boolean }) {
  const labelId = useId()
  const { field } = useControlSizes()
  return (
    <div className={styles.trust}>
      <div className={styles.text}>
        <span className={styles.label} id={labelId}>
          {copy.label}
        </span>
        <TrustHint replaced={props.replaced} trusted={props.trusted} />
      </div>
      <span className={styles.control}>
        <Switch
          aria-labelledby={labelId}
          onValueChange={noop}
          size={field}
          value={props.trusted}
        />
      </span>
    </div>
  )
}

/** The saved choice as a row of the read-only details, under the repository. */
export function trustDetail(trusted: boolean): Detail {
  return { term: copy.term, value: trusted ? copy.trusted : copy.untrusted }
}

/** What the saved choice does, under the read-only details. */
export function SavedTrustHint(props: { trusted: boolean }) {
  return <TrustHint replaced={false} trusted={props.trusted} />
}
