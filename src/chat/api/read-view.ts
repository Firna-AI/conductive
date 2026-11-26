import { isTerminalId } from '../../shared/terminal'
import {
  isTabPort,
  type TemporaryTab,
  type WorkspaceTab,
  type WorkspaceView,
  type WorkspaceViewResponse,
} from '../../shared/workspace-view'
import {
  viewFromWire,
  type PreviewTabPlace,
} from '../../shared/workspace-view-wire'
import {
  count,
  isRecord,
  list,
  nullable,
  oneOf,
  optional,
  record,
  text,
  UnreadableResponse,
} from './json'
import { readSkill, readSkillPlaces, withSkillTabsInRow } from './view-skills'

function readTab(value: unknown): WorkspaceTab {
  const source = record(value, 'tab')
  switch (source.kind) {
    case 'session':
      return { kind: 'session', sessionId: text(source.sessionId) }
    case 'diff':
      return { kind: 'diff', path: text(source.path) }
    case 'preview':
      if (!isTabPort(source.port)) throw new UnreadableResponse('port')
      return { kind: 'preview', port: source.port }
    default:
      return {
        kind: oneOf({ file: true })(source.kind),
        path: text(source.path),
        mode: oneOf({ preview: true, source: true })(source.mode),
      }
  }
}

function readTemporaryTab(
  value: unknown,
  tabs: readonly WorkspaceTab[],
): TemporaryTab | null {
  if (
    !isRecord(value) ||
    (value.kind !== 'file' && value.kind !== 'diff') ||
    typeof value.path !== 'string' ||
    !value.path
  )
    return null
  return tabs.some(
    (tab) =>
      (tab.kind === 'file' || tab.kind === 'diff') &&
      tab.kind === value.kind &&
      tab.path === value.path,
  )
    ? { kind: value.kind, path: value.path }
    : null
}

/** A Preview tab of the route: its port and its place in the row. */
function readPreviewPlace(value: unknown): PreviewTabPlace {
  const place = record(value, 'preview tab')
  if (!isTabPort(place.port)) throw new UnreadableResponse('port')
  return { port: place.port, place: count(place.place) }
}

/**
 * The saved view from the shape of the route, as `WorkspaceViewWire` says:
 * the tabs, with each Preview tab and then each skill tab at its place in
 * the row, as `withSkillTabsInRow` says. Its shown terminal is optional,
 * and a value that names no terminal leaves it out, as the Worker does.
 */
export function readView(value: unknown): WorkspaceView {
  const view = record(record(value, 'view response').view, 'view')
  const tabs = list(readTab)(view.tabs)
  const activePreview = optional(nullable(count))(view.activePreview) ?? null
  if (activePreview !== null && !isTabPort(activePreview)) {
    throw new UnreadableResponse('port')
  }
  const wire = viewFromWire(
    {
      tabs,
      activeTab: nullable(readTab)(view.activeTab),
      temporaryTab: readTemporaryTab(view.temporaryTab, tabs),
      skillTabs: readSkillPlaces(view.skillTabs),
      activeSkill: readSkill(view.activeSkill),
      temporarySkill: readSkill(view.temporarySkill),
      fileList: oneOf({ all: true, changes: true, checks: true })(
        view.fileList,
      ),
      tool: oneOf({ terminal: true, preview: true, desktop: true })(view.tool),
      ...(isTerminalId(view.terminal) ? { terminal: view.terminal } : {}),
    },
    optional(list(readPreviewPlace))(view.previewTabs) ?? [],
    activePreview,
  )
  return withSkillTabsInRow(wire)
}

/**
 * The automation whose run made the workspace, with the pull request of a
 * pull request run, or null for a run of a schedule or of Run now.
 */
export type RunAutomation = Required<
  NonNullable<WorkspaceViewResponse['automation']>
>

/** The saved view, and the automation of a run workspace. */
export interface ViewReply {
  view: WorkspaceView
  /** Null for a workspace that a person created. */
  automation: RunAutomation | null
  /**
   * The absolute folder of the workspace repository, or null when the
   * reply gives none or gives a folder that is not absolute.
   */
  repositoryFolder: string | null
  /**
   * The repositories that the cloud computer holds, by ID, for the
   * repository menu. Null when the reply gives none, or when the workspace
   * has no record of its folders: the menu then lists only the current
   * repository.
   */
  heldRepositoryIds: readonly string[] | null
}

function readPullRequest(value: unknown): RunAutomation['pullRequest'] {
  const pullRequest = record(value, 'pull request')
  return { number: count(pullRequest.number), url: text(pullRequest.url) }
}

function readRunAutomation(value: unknown): RunAutomation {
  const automation = record(value, 'automation')
  const pullRequest = optional(nullable(readPullRequest))(
    automation.pullRequest,
  )
  return {
    id: text(automation.id),
    name: text(automation.name),
    pullRequest: pullRequest ?? null,
  }
}

/** A folder of the cloud computer: an absolute path without a last `/`. */
function readFolder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^\/[^\r\n]*[^/\r\n]$/u.test(value) ? value : null
}

/**
 * The IDs of the repositories that the cloud computer holds. A value that
 * is not a list of IDs reads as null, so the menu lists only the current
 * repository, and the view still reads.
 */
function readHeld(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null
  const ids: unknown[] = value
  return ids.every((id): id is string => typeof id === 'string') ? ids : null
}

export function readViewReply(value: unknown): ViewReply {
  const reply = record(value, 'view response')
  return {
    view: readView(value),
    automation: optional(nullable(readRunAutomation))(reply.automation) ?? null,
    repositoryFolder: readFolder(reply.repositoryFolder),
    heldRepositoryIds: readHeld(reply.heldRepositoryIds),
  }
}
