import { Input } from '@firna/ui/input'
import { noop } from '../../../../../src/ui/noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import type { IconKey } from '../../entries/components/common/icons'
import { inlineText } from '../../entries/components/common/InlineText.mockup'
import { loadFailure } from '../../entries/components/common/LoadFailure.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { detailList } from '../../entries/components/settings/DetailList.mockup'
import type { ReadOnlyCause } from '../../../../../src/ui/components/settings/readOnlyCause'
import {
  section,
  sectionText,
} from '../../entries/components/settings/Section.mockup'
import { skillList } from '../../entries/components/settings/SkillList.mockup'
import {
  type NoSkillsCause,
  type SkillsLookup,
  skillsCopy as copy,
  skillsNoticeText,
  type SkillsViewer,
} from '../../../../../src/ui/components/settings/skillsCopy'
import {
  savedTrustHint,
  trustSwitch,
} from '../../entries/components/settings/SkillsTrust.mockup'
import { type SkillsTrust, trustDetail } from './SkillsTrust'
import { defined } from '../../defined'

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
const noSkillsIcons: Readonly<Record<NoSkillsCause, IconKey>> = {
  private: 'lock',
  'not-found': 'search-x',
  'without-skills': 'folder-search',
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
    <notice.Component
      body={
        <inlineText.Component moklyInstance="no-skills-text" text={text.body} />
      }
      icon={noSkillsIcons[props.cause]}
      moklyInstance="no-skills"
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
      return (
        <loadFailure.Component
          body={copy.failed.body}
          moklyInstance="skills-failed"
          title={copy.failed.title}
        />
      )
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
      return (
        <skillList.Component
          moklyInstance="skill-list"
          skills={lookup.skills}
          {...defined({ incomplete: lookup.incomplete })}
        />
      )
  }
}

/**
 * The saved repository and its trust choice as read-only rows, then what
 * the choice does. Text that names no repository has no choice.
 */
function SavedSkills(props: { repository: string; trust?: SkillsTrust }) {
  const { trust } = props
  return (
    <>
      <detailList.Component
        moklyInstance="saved-repository"
        rows={[
          { term: copy.label, value: props.repository },
          ...(trust ? [trustDetail(trust.saved)] : []),
        ]}
      />
      {trust ? (
        <savedTrustHint.Component
          moklyInstance="saved-trust"
          trusted={trust.saved}
        />
      ) : null}
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
      <section.Component
        description={copy.description}
        moklyInstance="skills"
        title={copy.title}
      >
        {saved ? (
          <SavedSkills repository={saved} trust={trust} />
        ) : (
          <sectionText.Component moklyInstance="no-repository" muted>
            {copy.empty[props.readOnly]}
          </sectionText.Component>
        )}
        <LookupResult
          lookup={props.lookup}
          repository={saved}
          viewer={props.readOnly}
        />
      </section.Component>
    )
  }
  const value = props.draft ?? saved
  const trusted = trust ? (trust.draft ?? trust.saved) : false
  const changed = value !== saved || (trust ? trusted !== trust.saved : false)
  return (
    <section.Component
      actions={
        <actionButton.Component
          disabled={!changed}
          moklyInstance="save-repository"
        >
          {copy.save}
        </actionButton.Component>
      }
      description={copy.description}
      moklyInstance="skills"
      title={copy.title}
    >
      <RepositoryField value={value} />
      {trust ? (
        <trustSwitch.Component
          moklyInstance="trust"
          replaced={value !== saved}
          trusted={trusted}
        />
      ) : null}
      <LookupResult lookup={props.lookup} repository={saved} viewer="admin" />
    </section.Component>
  )
}
