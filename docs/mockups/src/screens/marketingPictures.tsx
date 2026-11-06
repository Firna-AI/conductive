import type { Viewport } from '@mokly/mokly'
import type {
  ScreenPicture,
  ScreenSize,
} from '../components/marketing/ScreenFrame'
import { acmeSettings, OrgSettingsScreen } from './OrgSettingsScreen'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

/** A desktop screen at the size of a laptop window. */
const desktop: ScreenSize = { width: 1440, height: 900 }

/** A phone screen, under the status band of the phone. */
const phone: ScreenSize = { width: 390, height: 800 }

/** The scale of an excerpt of a phone screen on a phone. */
const phoneExcerpt = 0.84

/** A new workspace while its cloud computer starts, as in the create flow. */
const creating: WorkspaceState = {
  ...readyWorkspace,
  workspace: 'saved-carts',
  sandbox: 'starting',
  conversation: 'queued',
  banner: 'no-commits',
}

function workspace(state: WorkspaceState, viewport: Viewport) {
  return <WorkspaceScreen state={state} viewport={viewport} />
}

/** The canonical workspace: two sessions, a file tab, a pull request. */
export function heroPicture(viewport: Viewport): ScreenPicture {
  const label =
    'The app: a workspace with its chat, its changed files, its terminal, and a pull request that is ready to merge'
  if (viewport === 'mobile') {
    return {
      label,
      size: phone,
      scale: 0.74,
      screen: workspace(readyWorkspace, 'mobile'),
    }
  }
  return {
    label,
    size: desktop,
    scale: 'inherit',
    screen: workspace(readyWorkspace, 'desktop'),
  }
}

/** The steps of a new workspace while its cloud computer starts. */
export function startingPicture(viewport: Viewport): ScreenPicture {
  const label =
    'A new workspace: the first message waits while the cloud computer starts and creates the branch'
  if (viewport === 'mobile') {
    const crop = { x: 0, y: 0, width: 390, height: 420 }
    return {
      label,
      size: phone,
      crop,
      scale: phoneExcerpt,
      screen: workspace(creating, 'mobile'),
    }
  }
  const crop = { x: 281, y: 0, width: 718, height: 330 }
  return {
    label,
    size: desktop,
    crop,
    scale: 0.86,
    screen: workspace(creating, 'desktop'),
  }
}

/**
 * The open picker of the model and the effort: over attached files on
 * desktop, and in a new session beside the other sessions on a phone.
 */
export function agentsPicture(viewport: Viewport): ScreenPicture {
  const state: WorkspaceState = { ...readyWorkspace, composer: 'picker' }
  if (viewport === 'mobile') {
    const fresh: WorkspaceState = { ...state, tab: 'new-session' }
    const crop = { x: 0, y: 100, width: 390, height: 640 }
    return {
      label:
        'A new agent session beside two others, with the open picker of the model and the effort',
      size: phone,
      crop,
      scale: phoneExcerpt,
      screen: workspace(fresh, 'mobile'),
    }
  }
  const crop = { x: 281, y: 466, width: 718, height: 434 }
  return {
    label:
      'The composer with two attached files, and the open picker of the model and the effort',
    size: desktop,
    crop,
    scale: 0.86,
    screen: workspace(state, 'desktop'),
  }
}

/** The pull request bar over the Changes list. */
export function reviewPicture(viewport: Viewport): ScreenPicture {
  const label =
    'The pull request is ready to merge, over the five changed files and their added and removed lines'
  if (viewport === 'mobile') {
    const state: WorkspaceState = { ...readyWorkspace, focus: 'files' }
    const crop = { x: 0, y: 0, width: 390, height: 420 }
    return {
      label,
      size: phone,
      crop,
      scale: phoneExcerpt,
      screen: workspace(state, 'mobile'),
    }
  }
  const crop = { x: 1000, y: 0, width: 440, height: 262 }
  return {
    label,
    size: desktop,
    crop,
    scale: 1,
    screen: workspace(readyWorkspace, 'desktop'),
  }
}

/** The terminal of the cloud computer, running the dev server. */
export function toolsPicture(viewport: Viewport): ScreenPicture {
  const label =
    'The terminal of the cloud computer runs the dev server, beside the Preview and Desktop tabs'
  if (viewport === 'mobile') {
    const state: WorkspaceState = { ...readyWorkspace, focus: 'tool' }
    const crop = { x: 0, y: 0, width: 390, height: 440 }
    return {
      label,
      size: phone,
      crop,
      scale: phoneExcerpt,
      screen: workspace(state, 'mobile'),
    }
  }
  const crop = { x: 1000, y: 511, width: 440, height: 350 }
  return {
    label,
    size: desktop,
    crop,
    scale: 1,
    screen: workspace(readyWorkspace, 'desktop'),
  }
}

/** The cloud computer of the org, with its last build and its history. */
export function orgPicture(viewport: Viewport): ScreenPicture {
  const label =
    'The cloud computer of the org: its last build, Build computer, and the history of builds'
  const screen = (
    <OrgSettingsScreen
      state={{ ...acmeSettings, tab: 'computer' }}
      viewport={viewport}
    />
  )
  if (viewport === 'mobile') {
    const crop = { x: 0, y: 0, width: 390, height: 500 }
    return { label, size: phone, crop, scale: phoneExcerpt, screen }
  }
  const crop = { x: 520, y: 76, width: 682, height: 352 }
  return { label, size: desktop, crop, scale: 0.9, screen }
}

/** The workspace list of a phone, with the state of each workspace. */
export function phonePicture(viewport: Viewport): ScreenPicture {
  return {
    label:
      'The workspace list on a phone: each workspace shows whether its agent works, is done, or waits',
    size: phone,
    scale: viewport === 'mobile' ? 0.74 : 0.72,
    screen: (
      <WorkspaceListScreen
        state={{ list: 'workspaces', menu: 'none' }}
        viewport="mobile"
      />
    ),
  }
}
