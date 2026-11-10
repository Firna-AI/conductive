import type { ReactNode } from 'react'
import {
  ScreenCapture,
  type FrameDevice,
  type ScreenPicture,
} from '../components/marketing/ScreenFrame'
import {
  marketingPictures,
  screenSizes,
  type MarketingPictureKey,
  type PictureLayout,
  type ScreenViewport,
} from './marketingPictureList'
import { MacAppScreen, type MacAppState } from './MacAppScreen'
import { acmeSettings, OrgSettingsScreen } from './OrgSettingsScreen'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

/** A new workspace while its cloud computer starts, as in the create flow. */
const creating: WorkspaceState = {
  ...readyWorkspace,
  workspace: 'saved-carts',
  sandbox: 'starting',
  conversation: 'queued',
  banner: 'no-commits',
}

/** The open picker of the model and the effort, over two attached files. */
const picker: WorkspaceState = { ...readyWorkspace, composer: 'picker' }

/** A command that waits for Allow in the window of the Mac app. */
const waitingCommand: MacAppState = {
  window: 'window',
  page: 'workspace',
  command: 'prompt',
  change: 'none',
  palette: 'closed',
  keyChange: 'none',
  shortcuts: 'default',
}

function workspace(state: WorkspaceState, viewport: ScreenViewport) {
  return <WorkspaceScreen state={state} viewport={viewport} />
}

/**
 * The screen and the state that each picture shows. The list in
 * `marketingPictureList.ts` gives the viewport of the screen, its part, its
 * scale, and its label.
 */
const screens: Readonly<
  Record<MarketingPictureKey, (viewport: ScreenViewport) => ReactNode>
> = {
  /** The canonical workspace: two sessions, a file tab, a pull request. */
  hero: (viewport) => workspace(readyWorkspace, viewport),
  /** The steps of a new workspace while its cloud computer starts. */
  starting: (viewport) => workspace(creating, viewport),
  /**
   * The open picker over attached files on desktop, and in a new session
   * beside the other sessions on a phone.
   */
  agents: (viewport) =>
    workspace(
      viewport === 'mobile' ? { ...picker, tab: 'new-session' } : picker,
      viewport,
    ),
  /** The pull request bar over the Changes list. */
  review: (viewport) =>
    workspace(
      viewport === 'mobile'
        ? { ...readyWorkspace, focus: 'files' }
        : readyWorkspace,
      viewport,
    ),
  /** The terminal of the cloud computer, running the dev server. */
  tools: (viewport) =>
    workspace(
      viewport === 'mobile'
        ? { ...readyWorkspace, focus: 'tool' }
        : readyWorkspace,
      viewport,
    ),
  /** The cloud computer of the org, with its last build and its history. */
  org: (viewport) => (
    <OrgSettingsScreen
      state={{ ...acmeSettings, tab: 'computer' }}
      viewport={viewport}
    />
  ),
  /** The workspace list of a phone, with the state of each workspace. */
  phone: (viewport) => (
    <WorkspaceListScreen
      state={{ list: 'workspaces', menu: 'none', palette: 'closed' }}
      viewport={viewport}
    />
  ),
  /**
   * The window of the Mac app with its buttons and the sidebar, where an
   * agent asks to run a command on this Mac. The Mac app has no phone
   * layout, so each layout shows the screen of a Mac.
   */
  mac: () => <MacAppScreen state={waitingCommand} />,
}

/** A picture of the home page in one layout, and how the page frames it. */
export type FramedPicture = { picture: ScreenPicture; device: FrameDevice }

/** The device of a frame in one layout. */
function frameDevice(
  key: MarketingPictureKey,
  layout: PictureLayout,
): FrameDevice {
  const { frame } = marketingPictures[key]
  if (frame === 'window-or-phone') {
    return layout === 'mobile' ? 'phone' : 'window'
  }
  return frame
}

/** The picture of the home page with a key, in one layout of the page. */
export function marketingPicture(
  key: MarketingPictureKey,
  layout: PictureLayout,
): FramedPicture {
  const view = marketingPictures[key][layout]
  return {
    picture: {
      label: view.label,
      size: screenSizes[view.screen],
      crop: view.crop,
      scale: view.scale,
      screen: screens[key](view.screen),
    },
    device: frameDevice(key, layout),
  }
}

/**
 * The capture page of a picture in one layout: the part of the screen at its
 * own size, without a frame, as the capture command saves it.
 */
export function PictureCapture(props: {
  pictureKey: MarketingPictureKey
  layout: PictureLayout
}) {
  const { picture } = marketingPicture(props.pictureKey, props.layout)
  return <ScreenCapture picture={picture} />
}
