import { Input } from '@firna/ui/input'
import { FolderSearch, Lock, SearchX, type LucideIcon } from 'lucide-react'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { SkillList } from '../../../docs/mockups/src/components/settings/SkillList'
import {
  skillsCopy as copy,
  skillsNoticeText,
  type NoSkillsCause,
} from '../../../docs/mockups/src/components/settings/skillsCopy'
import type { ComputerModel } from '../../app/computer-model'
import { shownSkills } from '../../app/skills-lookup'
import { useStore } from '../../app/store'
import type { SkillsRepositoryLookupResponse } from '../../shared/org-settings'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'
import { Loaded } from './LoadState'

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
 * saves as owner/name. Save repository waits for a change, and an empty
 * Save removes the repository. The field stays mounted through its saves,
 * so it keeps the text typed while a save runs. Under the field, the
 * section lists the skills that the lookup found in the saved repository,
 * or a notice in place of the list. Unsaved text changes neither of them.
 * A failed lookup shows its notice with Try again, and an expired GitHub
 * sign-in shows the message of the API, as other GitHub reads do.
 */
export function SkillsSection(props: {
  computer: ComputerModel
  /** The saved owner/name, or empty text when the org has none. */
  repository: string
}) {
  const { computer, repository } = props
  const { field } = useControlSizes()
  const draft = useSavedDraft(repository)
  const lookup = useStore(computer.skills)
  const save = useAction(
    () => draft.save((typed) => computer.saveSkillsRepository(typed)),
    'The skills repository was not saved',
  )
  const changed = draft.draft !== repository
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
        onChangeText={draft.change}
        onSubmitEditing={submit}
        placeholder={copy.placeholder}
        size={field}
        spellCheck={false}
        value={draft.draft}
      />
      {repository === '' ? null : (
        <Loaded failure={copy.failed.title} retry={retry} value={lookup}>
          {(found) => <FoundSkills found={found} retry={retry} />}
        </Loaded>
      )}
    </Section>
  )
}
