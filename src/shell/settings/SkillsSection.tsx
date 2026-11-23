import { Input } from '@firna/ui/input'
import { FolderSearch, Lock, SearchX, type LucideIcon } from 'lucide-react'
import { InlineText } from '../../ui/components/common/InlineText'
import { Notice } from '../../ui/components/common/Notice'
import { useControlSizes } from '../../ui/components/common/touch'
import { Section } from '../../ui/components/settings/Section'
import { SkillList } from '../../ui/components/settings/SkillList'
import {
  skillsCopy as copy,
  skillsNoticeText,
  type NoSkillsCause,
} from '../../ui/components/settings/skillsCopy'
import type { ComputerModel } from '../../app/computer-model'
import { shownSkills } from '../../app/skills-lookup'
import {
  namesSkillsRepository,
  replacesSkillsRepository,
  sameSkillsChoice,
  type SkillsChoice,
} from '../../app/skills-trust'
import { useStore } from '../../app/store'
import type { SkillsRepositoryLookupResponse } from '../../shared/org-settings'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'
import { Loaded } from './LoadState'
import { TrustSwitch } from './SkillsTrust'

/** The icon of each notice of a saved repository that gives no skills. */
const noSkillsIcons: Readonly<Record<NoSkillsCause, LucideIcon>> = {
  private: Lock,
  'not-found': SearchX,
  'without-skills': FolderSearch,
}

/**
 * What the lookup found in the saved repository: the list of its skills,
 * or a notice in place of the list. The notice of a repository that gives
 * no skills is neutral, because only the value needs a change. A lookup
 * that GitHub did not answer gives the notice of data that did not load,
 * with Try again.
 */
function FoundSkills(props: {
  found: SkillsRepositoryLookupResponse
  retry: () => Promise<void>
}) {
  const shown = shownSkills(props.found)
  switch (shown.kind) {
    case 'list':
      return <SkillList incomplete={shown.incomplete} skills={shown.skills} />
    case 'failed':
      return (
        <LoadFailure
          body={copy.failed.body}
          retry={props.retry}
          title={copy.failed.title}
        />
      )
    case 'notice': {
      const text = skillsNoticeText({
        cause: shown.cause,
        repository: props.found.repository,
        viewer: 'admin',
      })
      return (
        <Notice
          body={<InlineText text={text.body} />}
          icon={noSkillsIcons[shown.cause]}
          title={text.title}
        />
      )
    }
  }
}

/**
 * The public GitHub repository whose skills the agents of every workspace
 * of the org use. Only an admin changes it (skills decision 2 A), in a
 * field that takes owner/name or a link from GitHub, which the Worker
 * saves as owner/name. An empty Save removes the repository. The field
 * stays mounted through its saves, so it keeps the text typed while a save
 * runs. Under the field, the section lists the skills that the lookup
 * found in the saved repository, or a notice in place of the list.
 * Unsaved text changes neither of them. A failed lookup shows its notice
 * with Try again, and an expired GitHub sign-in shows the message of the
 * API, as other GitHub reads do.
 *
 * While the field names a repository, the trust switch shows under it.
 * The field and the switch form one draft: each edit of the text turns the
 * switch off, so trust never passes to another repository, and the admin
 * can then turn it on for the new text. Save repository waits for a change
 * of either, and saves both in one write. A failed save keeps the draft.
 * The draft settles to the choice that the answer saved, such as an
 * untrusted repository when the Worker saved no grant.
 */
export function SkillsSection(props: {
  computer: ComputerModel
  /** The saved owner/name, or empty text, and its saved trust choice. */
  saved: SkillsChoice
}) {
  const { computer, saved } = props
  const { field } = useControlSizes()
  const draft = useSavedDraft(saved, sameSkillsChoice)
  const lookup = useStore(computer.skills)
  const save = useAction(
    () => draft.save((choice) => computer.saveSkillsRepository(choice)),
    'The skills repository was not saved',
  )
  const { repository, trusted } = draft.draft
  const changed = !sameSkillsChoice(draft.draft, saved)
  const submit = () => {
    if (changed) save.run()
  }
  const retry = () => computer.loadSkills()
  return (
    <Section
      actions={
        <ActionButton
          busy={save.pending}
          disabled={!changed}
          keepFocus
          onPress={submit}
        >
          {copy.save}
        </ActionButton>
      }
      description={copy.description}
      title={copy.title}
    >
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        hint={copy.hint}
        label={copy.label}
        onChangeText={(text) =>
          draft.change({ repository: text, trusted: false })
        }
        onSubmitEditing={submit}
        placeholder={copy.placeholder}
        size={field}
        spellCheck={false}
        value={repository}
      />
      {namesSkillsRepository(repository) ? (
        <TrustSwitch
          onChange={(on) => draft.change({ repository, trusted: on })}
          replaced={replacesSkillsRepository(repository, saved.repository)}
          trusted={trusted}
        />
      ) : null}
      {saved.repository === '' ? null : (
        <Loaded failure={copy.failed.title} retry={retry} value={lookup}>
          {(found) => <FoundSkills found={found} retry={retry} />}
        </Loaded>
      )}
    </Section>
  )
}
