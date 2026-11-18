import { Input } from '@firna/ui/input'
import { FolderSearch, Lock, type LucideIcon, SearchX } from 'lucide-react'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { InlineText } from '../common/InlineText'
import { LoadFailure } from '../common/LoadFailure'
import { Notice } from '../common/Notice'
import { useControlSizes } from '../common/touch'
import { type Detail, DetailList } from './DetailList'
import type { ReadOnlyCause } from './OrgSections'
import { Section, SectionText } from './Section'
import { SkillList } from './SkillList'
import {
  type NoSkillsCause,
  type SkillsLookup,
  skillsCopy as copy,
  skillsNoticeText,
  type SkillsViewer,
} from './skillsCopy'
import {
  SavedTrustHint,
  type SkillsTrust,
  trustDetail,
  TrustSwitch,
} from './SkillsTrust'

/**
 * The field of an admin. It takes owner/name or a link from GitHub, and
 * Save stores owner/name.
 */
function RepositoryField(props: { value: string }) {
  const { field } = useControlSizes()
  return (
    <Input
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect={false}
      hint={copy.hint}
      label={copy.label}
      onChangeText={noop}
      placeholder={copy.placeholder}
      size={field}
      spellCheck={false}
      value={props.value}
    />
  )
}

/** The icon of each notice of a repository that gives no skills. */
const noSkillsIcons: Readonly<Record<NoSkillsCause, LucideIcon>> = {
  private: Lock,
  'not-found': SearchX,
  'without-skills': FolderSearch,
}

/**
 * The notice in place of the list, for a saved repository that gives no
 * skills. The lookup worked, and only the value needs a change, so the
 * notice is neutral.
 */
function NoSkillsNotice(props: {
  cause: NoSkillsCause
  repository: string
  viewer: SkillsViewer
}) {
  const text = skillsNoticeText(props)
  return (
    <Notice
      body={<InlineText text={text.body} />}
      icon={noSkillsIcons[props.cause]}
      title={text.title}
    />
  )
}

/**
 * What the lookup of the saved repository found: the list of its skills,
 * or a notice in place of the list. A lookup that did not end gives the
 * notice of data that did not load, with Try again. The list and the
 * notices belong to the saved repository, so unsaved text in the field
 * changes neither of them.
 */
function LookupResult(props: {
  lookup?: SkillsLookup
  repository: string
  viewer: SkillsViewer
}) {
  const { lookup, repository, viewer } = props
  if (lookup === undefined || repository === '') return null
  switch (lookup.result) {
    case 'failed':
      return <LoadFailure body={copy.failed.body} title={copy.failed.title} />
    case 'private':
    case 'not-found':
      return (
        <NoSkillsNotice
          cause={lookup.result}
          repository={repository}
          viewer={viewer}
        />
      )
    case 'found':
      if (lookup.skills.length === 0 && !lookup.incomplete) {
        return (
          <NoSkillsNotice
            cause="without-skills"
            repository={repository}
            viewer={viewer}
          />
        )
      }
      return <SkillList incomplete={lookup.incomplete} skills={lookup.skills} />
  }
}

/**
 * The saved repository and its trust choice as read-only rows, then what
 * the choice does. Text that names no repository has no choice.
 */
function SavedSkills(props: { repository: string; trust?: SkillsTrust }) {
  const { trust } = props
  const rows: Detail[] = [{ term: copy.label, value: props.repository }]
  if (trust) rows.push(trustDetail(trust.saved))
  return (
    <>
      <DetailList rows={rows} />
      {trust ? <SavedTrustHint trusted={trust.saved} /> : null}
    </>
  )
}

/**
 * The public GitHub repository whose skills the agents of every workspace
 * of the org use. Only an admin changes it, because it changes the work of
 * every agent of the org. `repository` is the
 * saved owner/name, or none for an org without one, such as a new org.
 * `lookup` is what the lookup of the saved repository found on GitHub, and
 * the section lists those skills under the repository. `draft` is the
 * text of the field when an admin changed it and has not saved, such as a
 * pasted link.
 *
 * `trust` is the trust choice of the repository, while the field names
 * one: a switch under the field, off for each new repository. The field
 * and the switch form one draft, and Save repository waits for a change
 * of either. `readOnly` shows the saved repository and its choice
 * as text, without the field, the switch, and Save, for a member who is
 * not an admin and in a suspended org.
 */
export function SkillsSection(props: {
  repository?: string
  lookup?: SkillsLookup
  draft?: string
  trust?: SkillsTrust
  readOnly?: ReadOnlyCause
}) {
  const saved = props.repository ?? ''
  const { trust } = props
  if (props.readOnly) {
    return (
      <Section description={copy.description} title={copy.title}>
        {saved ? (
          <SavedSkills repository={saved} trust={trust} />
        ) : (
          <SectionText muted>{copy.empty[props.readOnly]}</SectionText>
        )}
        <LookupResult
          lookup={props.lookup}
          repository={saved}
          viewer={props.readOnly}
        />
      </Section>
    )
  }
  const value = props.draft ?? saved
  const trusted = trust ? (trust.draft ?? trust.saved) : false
  const changed = value !== saved || (trust ? trusted !== trust.saved : false)
  return (
    <Section
      actions={<ActionButton disabled={!changed}>{copy.save}</ActionButton>}
      description={copy.description}
      title={copy.title}
    >
      <RepositoryField value={value} />
      {trust ? (
        <TrustSwitch replaced={value !== saved} trusted={trusted} />
      ) : null}
      <LookupResult lookup={props.lookup} repository={saved} viewer="admin" />
    </Section>
  )
}
