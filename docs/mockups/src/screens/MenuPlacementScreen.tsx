import type { Viewport } from '@mokly/mokly'
import { modelPicker } from '../entries/components/chat/ModelPicker.mockup'
import {
  placedModelAnchor,
  placedModelMenu,
} from '../entries/components/chat/PlacedModelMenu.mockup'
import { classes } from '../../../../src/ui/components/common/classes'
import { Menu } from '../../../../src/ui/components/common/Menu'
import { plainEntry } from '../entries/components/common/menuEntries'
import { HistoryAnchor } from '../components/workspace/WorkspaceTabs'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { MacAppScreen } from './MacAppScreen'
import type { MacAppState } from './macAppState'
import { WorkspaceScreen } from './WorkspaceScreen'
import { historyFor } from './workspaceTabs'
import { readyWorkspace, type WorkspaceState } from './workspaceState'
import styles from './MenuPlacementScreen.module.css'

/** The open menu: Model and effort, Session history, or More ways to allow. */
export type PlacedMenu = 'model' | 'history' | 'allow'

/**
 * A draft in the composer, and a long script that waits above it. The
 * script scrolls inside its card, which fades where it cuts the command. A
 * browser shows its state only, so the card has no menu of its own.
 */
const modelState: WorkspaceState = {
  ...readyWorkspace,
  conversation: 'mac-waiting-script',
  composer: 'draft',
}

/**
 * A full tab row, which scrolls sideways and fades where it cuts tabs, with
 * the session history open.
 */
const historyState: WorkspaceState = {
  ...readyWorkspace,
  tab: 'new-session',
  tabRow: 'full',
  overlay: 'history',
}

/**
 * Four commands in the Mac app, with the other ways to allow of the first
 * request open. Previous and Next open the pages of `mac-app/requests`, the
 * walk of the same stack.
 */
const allowState: MacAppState = {
  window: 'window',
  page: 'workspace',
  command: 'many-choices',
  change: 'none',
  palette: 'closed',
  keyChange: 'none',
  shortcutSearch: 'none',
  shortcuts: 'default',
}

/**
 * The workspace with the model menu of its composer open, with the
 * favourites of the viewer first, above the page at its picker.
 */
function ModelMenuScreen(props: { viewport: Viewport }) {
  const { choice } = checkoutAutocomplete
  return (
    <WorkspaceScreen
      overlay={
        <placedModelMenu.Component
          choice={choice}
          fastKey
          moklyInstance="model-menu"
          placement="above"
          sessionAgent={choice.agent}
        />
      }
      picker={
        <placedModelAnchor.Component moklyInstance="model-anchor">
          {/* The screen draws the menu above the page, so none in place. */}
          <modelPicker.Component
            choice={choice}
            menu={false}
            moklyInstance="model-picker"
            open
          />
        </placedModelAnchor.Component>
      }
      state={modelState}
      viewport={props.viewport}
    />
  )
}

/**
 * The workspace with the session history open. A phone draws the history as
 * a sheet, from the overlay of the state.
 */
function HistoryMenuScreen(props: { viewport: Viewport }) {
  const phone = props.viewport === 'mobile'
  return (
    <HistoryAnchor.Provider value={phone ? undefined : styles.historyAnchor}>
      <WorkspaceScreen
        overlay={
          phone ? undefined : (
            <div className={classes(styles.above, styles.history)}>
              <Menu
                entries={historyFor(historyState).map(plainEntry)}
                label="Session history"
                placement="point"
                wide
              />
            </div>
          )
        }
        state={historyState}
        viewport={props.viewport}
      />
    </HistoryAnchor.Provider>
  )
}

/**
 * A menu beside its button over a box that clips or scrolls: the model menu
 * of the composer over a request above it, the session history below a
 * full tab row, or the other ways to allow of a request in the Mac app.
 * The app opens each one above every box of the page, so no box cuts it. A
 * view runs no script, so the screen draws the open menu above the page, and
 * CSS places it at its button. The stack of the requests draws the other
 * ways to allow in the same way, as `DrawnChoices` says. A phone keeps its
 * own layout: the session history is a sheet there, and the Mac app shows
 * the same screen, smaller.
 */
export function MenuPlacementScreen(props: {
  menu: PlacedMenu
  viewport: Viewport
}) {
  switch (props.menu) {
    case 'model':
      return <ModelMenuScreen viewport={props.viewport} />
    case 'history':
      return <HistoryMenuScreen viewport={props.viewport} />
    case 'allow':
      return <MacAppScreen state={allowState} />
  }
}
