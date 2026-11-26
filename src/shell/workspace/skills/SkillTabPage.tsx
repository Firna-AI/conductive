import { useCallback, useSyncExternalStore } from 'react'
import { replacesShownFile } from '../../../ui/components/workspace/sandboxNoticeState'
import {
  agentSkills,
  type SkillsStore,
} from '../../../chat/mentions/mention-skills'
import { tabKey } from '../../../chat/state/tab-order'
import type { FilesLayout } from '../../../files/navigation'
import { SkillPage } from '../../../files/page/SkillPage'
import type { SkillIdentity } from '../../../shared/skills'
import { useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { useFilesNavigation } from '../files/files-navigation'
import { pagePlaceholder } from '../files/page-placeholder'
import { skillTab, useOpenSkillTab } from './skill-navigation'
import { useSkillRead } from './skill-read'
import { useSkillView } from './skill-views'

/**
 * The description of a skill from the list of its agent, or null while
 * that list does not hold the skill, gives no description, or has not
 * loaded. The header then shows the name only.
 */
function useDescription(
  skills: SkillsStore,
  skill: SkillIdentity,
): string | null {
  const { agent, name } = skill
  const read = useCallback(() => {
    const listed = agentSkills(skills.getSnapshot(), agent)
    return listed.find((each) => each.name === name)?.description ?? ''
  }, [skills, agent, name])
  const description = useSyncExternalStore(skills.subscribe, read, read)
  return description === '' ? null : description
}

/**
 * The skill tab of the address as a page, which keeps its tab open and
 * active in the saved view. The header takes the name and the description
 * from the skills list. The page reads the text each time it shows, and
 * again after each skills report, while the cloud computer runs. A cloud
 * computer that is stopped or starts, and one whose later start failed,
 * keep the text that the page shows, as for a file tab. Otherwise the
 * state of the sandbox takes the place of the text, which is the wait
 * while it starts. On a phone the page leads back to All files.
 */
export function SkillTabPage(props: {
  context: WorkspaceContext
  skill: SkillIdentity
  layout: FilesLayout
}) {
  const { context, skill } = props
  useOpenSkillTab(context.savedView, skill)
  const navigation = useFilesNavigation(context)
  const fetch = useOrgServices(context.org.id).api.fetch
  const placeholder = pagePlaceholder(context)
  const source = {
    fetch,
    orgId: context.org.id,
    workspaceId: context.workspace.id,
  }
  const { state, retry } = useSkillRead(
    source,
    context.skills,
    skill,
    !placeholder,
  )
  const keepShown = context.panel !== null && !replacesShownFile(context.panel)
  const kept = keepShown && state?.status === 'ready'
  const [mode, setMode] = useSkillView(context.skills, tabKey(skillTab(skill)))
  const description = useDescription(context.skills, skill)
  return (
    <SkillPage
      description={description}
      layout={props.layout}
      mode={mode}
      navigation={navigation}
      onMode={setMode}
      onRetry={retry}
      placeholder={placeholder && !kept ? placeholder : undefined}
      read={state}
      skill={skill}
    />
  )
}
