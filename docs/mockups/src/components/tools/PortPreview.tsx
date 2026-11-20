import {
  detectedServers,
  openPort,
  openPorts,
  previewUrl,
  serversUnavailable,
} from '../../fixtures/previews'
import { paths } from '../../paths'
import { plainData } from '../../defined'
import { lostUpdateRow } from '../../entries/components/chat/LostUpdate.mockup'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { externalLink } from '../../entries/components/common/ExternalLink.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  portMessage,
  serverList,
} from '../../entries/components/tools/PortForm.mockup'
import { previewTabs as previewTabsPart } from '../../entries/components/tools/PreviewTabs.mockup'
import { portFormCopy, previewTabLabel, serverDescription } from './previewCopy'
import { storefrontPage } from '../../entries/components/tools/StorefrontPage.mockup'
import styles from './PortPreview.module.css'

/**
 * The states of the Preview tool: open previews, or on a phone "+" beside
 * their tabs. A phone shows the open preview in a frame of the tool, and
 * the desktop in the Preview tab of the centre row. With no preview open,
 * the port form lists
 * the servers that the runner detects, says that it reports none, or reads
 * as before when the app has no report, as for an older image. After a
 * failed repair of the list, the form keeps its last list under a notice.
 */
export const previewStates = [
  'open',
  'adding',
  'detected',
  'no-servers',
  'no-report',
  'repair-failed',
] as const

export type PreviewState = (typeof previewStates)[number]

/**
 * A tab for each open preview: the port and the cut name of its server.
 * The tooltip and the spoken name give the full name and the folder.
 * `current` is the port of the preview that shows, or null for none.
 */
function previewTabs(current: number | null) {
  return openPorts.map((port) => {
    const server = detectedServers.find((each) => each.port === port)
    return {
      label: previewTabLabel(port, server),
      title: server ? serverDescription(server) : undefined,
      to: paths.preview,
      selected: port === current,
    }
  })
}

/** Reload and Open of the preview that shows. */
export function PreviewActions() {
  return (
    <>
      <iconButton.Component
        icon="rotate-cw"
        label="Reload"
        moklyInstance="reload-preview"
      />
      <span className={styles.link}>
        <externalLink.Component
          href={previewUrl}
          label="Open in new tab"
          moklyInstance="open-preview"
        >
          Open
        </externalLink.Component>
      </span>
    </>
  )
}

/**
 * The open previews on a phone. A preview shows in a frame, with a link to
 * a new tab. Each tab closes its preview with the Close button beside its
 * label. After "+", no tab is current, and the port form lists the servers
 * that have no preview yet.
 */
function PhonePreview(props: { adding: boolean }) {
  const { adding } = props
  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        {/* Beside the actions of the frame, two named tabs do not fit. */}
        <previewTabsPart.Component
          fadeEnd={!adding}
          moklyInstance="preview-tabs"
          tabs={plainData(previewTabs(adding ? null : openPort))}
        />
        {adding ? (
          <iconButton.Component
            icon="plus"
            label="Preview another port"
            moklyInstance="preview-another-port"
            pressed
          />
        ) : (
          <ScreenLink asChild to={paths.previewAnotherPort}>
            <iconButton.Component
              icon="plus"
              label="Preview another port"
              moklyInstance="preview-another-port"
            />
          </ScreenLink>
        )}
        <span className={styles.spacer} />
        {adding ? null : <PreviewActions />}
      </div>
      {adding ? (
        <serverList.Component
          moklyInstance="server-list"
          servers={unopened()}
        />
      ) : (
        <div className={styles.frame}>
          <storefrontPage.Component moklyInstance="storefront-page" />
        </div>
      )}
    </div>
  )
}

/**
 * The tool in the tools panel of the desktop (decisions 290 and 291). It
 * has no bar: each port has its own Preview tab in the centre row, with
 * Reload and Open in the bar of that tab. The tool lists each port, also
 * the ports that have a tab. A click on a port shows its tab, or opens one.
 * The row of the shown tab is the current one. The user does not end a
 * preview: it ends by itself when the cloud computer stops (decisions 292
 * and 294).
 */
function PanelPreview(props: { shown: number | null }) {
  return (
    <div className={styles.preview}>
      <serverList.Component
        current={props.shown}
        moklyInstance="server-list"
        servers={detectedServers}
      />
    </div>
  )
}

/** The servers that have no preview yet, in the order of their ports. */
function unopened() {
  return detectedServers.filter((server) => !openPorts.includes(server.port))
}

/**
 * The Preview tool in one of its states. `frame` draws the page in the
 * tool, as a phone does. Without it, the page shows in the Preview tab of
 * its port in the centre row. On desktop, "+" and its `adding` state do not exist, so
 * `adding` draws the open previews.
 */
export function PreviewTool(props: {
  state: PreviewState
  frame: boolean
  /** The port of the Preview tab that shows on desktop, or null. */
  shownPort: number | null
}) {
  const open = props.frame ? (
    <PhonePreview adding={props.state === 'adding'} />
  ) : (
    <PanelPreview shown={props.shownPort} />
  )
  switch (props.state) {
    case 'open':
    case 'adding':
      return open
    case 'detected':
      return (
        <serverList.Component
          moklyInstance="server-list"
          servers={detectedServers}
        />
      )
    case 'no-servers':
      return (
        <portMessage.Component
          body={portFormCopy.noServers}
          moklyInstance="port-message"
        />
      )
    case 'no-report':
      return (
        <portMessage.Component
          body={portFormCopy.body}
          moklyInstance="port-message"
        />
      )
    case 'repair-failed':
      // The notice joins the list, as the notice of a file list joins the
      // file lists. The last list and the field stay usable.
      return (
        <>
          <serverList.Component
            moklyInstance="server-list"
            servers={detectedServers}
          />
          <lostUpdateRow.Component
            moklyInstance="lost-servers"
            repair={serversUnavailable}
          />
        </>
      )
  }
}
