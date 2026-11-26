import { useId } from 'react'
import { Switch } from '@firna/ui/switch'
import { noop } from '../../../../../src/ui/noop'
import { externalLink } from '../../entries/components/common/ExternalLink.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  skillsTrustCopy as copy,
  trustHint,
} from '../../../../../src/ui/components/settings/skillsTrustCopy'
import styles from '../../../../../src/ui/components/settings/SkillsTrust.module.css'

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
      <externalLink.Component
        href={copy.guide.href}
        moklyInstance="trust-guide"
      >
        {copy.guide.label}
      </externalLink.Component>
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

/**
 * The saved choice as a row of the read-only details, under the repository.
 * Its value is text, so the row is data for the registered detail list.
 */
export function trustDetail(trusted: boolean): { term: string; value: string } {
  return { term: copy.term, value: trusted ? copy.trusted : copy.untrusted }
}

/** What the saved choice does, under the read-only details. */
export function SavedTrustHint(props: { trusted: boolean }) {
  return <TrustHint replaced={false} trusted={props.trusted} />
}
