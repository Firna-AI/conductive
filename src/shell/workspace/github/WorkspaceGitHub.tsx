import {
  createContext,
  useContext,
  useMemo,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useNow } from '../../../app/time'
import type { FilesTarget } from '../../../files/navigation'
import type { BarActions } from '../../../github/barActions'
import type { BarControls } from '../../../github/barView'
import type { GitHubFeed, GitHubSource } from '../../../github/githubStore'
import { PullRequestBar } from '../../../github/PullRequestBar'
import { PullRequestRow } from '../../../github/PullRequestRow'
import { useGitHubState } from '../../../github/useGitHubState'
import { useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { useFilesNavigation } from '../files/files-navigation'
import { useScreenActions, useScreenControls } from './bar-controls'
import { useBranchFeed } from './bar-feed'
import { githubSubscribe } from './github-events'

const GitHubFeedContext = createContext<GitHubFeed | null>(null)

/** The bar actions of the screen: their view, and the store of their runs. */
interface ScreenBar {
  controls: BarControls | null
  actions: BarActions
}

const BarContext = createContext<ScreenBar | null>(null)

/** The GitHub state of the open workspace, or null outside its screen. */
export function useGitHubFeed(): GitHubFeed | null {
  return useContext(GitHubFeedContext)
}

/** The bar actions of the open workspace, or null outside its screen. */
export function useScreenBar(): ScreenBar | null {
  return useContext(BarContext)
}

/**
 * One GitHub store for the open workspace, for the pull request bar or row
 * and for the Checks tab, with one action state for the bar on desktop and
 * the top of the Checks tab on a phone. It reads with the fetch of the org,
 * follows the ordered stream of the workspace, and waits with the timer of
 * the app. A state of another branch shows as loading.
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
  const feed = useBranchFeed(github, workspace.branch)
  const actions = useScreenActions(props.context, github)
  const controls = useScreenControls(props.context, feed, actions)
  const bar = useMemo(() => ({ controls, actions }), [controls, actions])
  return (
    <GitHubFeedContext.Provider value={feed}>
      <BarContext.Provider value={bar}>{props.children}</BarContext.Provider>
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
 * The pull request bar at the top of the right column, with its actions, or
 * the row under the header of a phone, which opens the Checks tab, where
 * the actions show at the top. After a merge, Archive archives the
 * workspace at once, and its button shows busy while it runs.
 */
export function PullRequestPart(props: { context: WorkspaceContext }) {
  const { context } = props
  const github = useGitHubFeed()
  const controls = useScreenBar()?.controls ?? null
  const navigation = useFilesNavigation(context)
  const now = useNow(60_000)
  if (!github) return null
  if (context.viewport === 'phone') {
    return (
      <PullRequestRow
        checksHref={navigation.href(checks)}
        controls={controls}
        github={github}
        onOpenChecks={(event) => {
          if (!isPlainClick(event)) return
          event.preventDefault()
          navigation.navigate(checks)
        }}
      />
    )
  }
  return <PullRequestBar controls={controls} github={github} now={now} />
}
