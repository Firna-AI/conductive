import {
  createContext,
  useContext,
  useMemo,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useNow } from '../../../app/time'
import type { FilesTarget } from '../../../files/navigation'
import type { GitHubFeed, GitHubSource } from '../../../github/githubStore'
import { PullRequestBar } from '../../../github/PullRequestBar'
import { PullRequestRow } from '../../../github/PullRequestRow'
import { useGitHubState } from '../../../github/useGitHubState'
import { useOrgServices } from '../../context'
import { shortcutLabels, useShortcutHint } from '../../shortcuts/shortcut-hints'
import type { WorkspaceContext } from '../features'
import { useFilesNavigation } from '../files/files-navigation'
import { githubSubscribe } from './github-events'

const GitHubFeedContext = createContext<GitHubFeed | null>(null)

/** The GitHub state of the open workspace, or null outside its screen. */
export function useGitHubFeed(): GitHubFeed | null {
  return useContext(GitHubFeedContext)
}

/**
 * One GitHub store for the open workspace, for the pull request bar or row
 * and for the Checks tab. It reads with the fetch of the org, follows the
 * ordered stream of the workspace, and waits with the timer of the app.
 */
export function WorkspaceGitHub(props: {
  context: WorkspaceContext
  children: ReactNode
}) {
  const services = useOrgServices(props.context.org.id)
  const { org, workspace, stream } = props.context
  const source = useMemo<GitHubSource>(
    () => ({
      fetch: services.api.fetch,
      subscribe: githubSubscribe(stream),
      delay: services.delay,
    }),
    [services, stream],
  )
  const github = useGitHubState(
    { orgId: org.id, workspaceId: workspace.id },
    source,
  )
  return (
    <GitHubFeedContext.Provider value={github}>
      {props.children}
    </GitHubFeedContext.Provider>
  )
}

const checks: FilesTarget = { kind: 'list', list: 'checks' }

/** A plain left click, which the shell handles without a page load. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * The pull request bar at the top of the right column, or the row under the
 * header of a phone, whose pull request opens the Checks tab. After a merge,
 * Archive opens the app's Archive question, and its tooltip shows the key
 * of Archive workspace.
 */
export function PullRequestPart(props: { context: WorkspaceContext }) {
  const { context } = props
  const github = useGitHubFeed()
  const navigation = useFilesNavigation(context)
  const now = useNow(60_000)
  const archiveKey = shortcutLabels(
    'Archive',
    useShortcutHint('archive-workspace'),
  )
  if (!github) return null
  if (context.viewport === 'phone') {
    return (
      <PullRequestRow
        checksHref={navigation.href(checks)}
        github={github}
        onOpenChecks={(event) => {
          if (!isPlainClick(event)) return
          event.preventDefault()
          navigation.navigate(checks)
        }}
      />
    )
  }
  return (
    <PullRequestBar
      archiveKey={archiveKey}
      github={github}
      now={now}
      onArchive={context.archive}
      viewer={{ id: context.viewer.id, role: context.org.role }}
      workspace={context.workspace}
    />
  )
}
