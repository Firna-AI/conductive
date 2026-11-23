import type { ListeningPort } from '../shared/generated/ListeningPort'
import rows from '../ui/components/tools/PortForm.module.css'
import {
  portFormCopy,
  serverDescription,
} from '../ui/components/tools/previewCopy'
import { classes } from '../ui/components/common/classes'
import styles from './PreviewOpenForm.module.css'

/**
 * The servers that listen in the sandbox: a button for each, with its port,
 * its program name, and its folder, when the report has them. A folder that
 * does not fit keeps its end, after "…". The tooltip and the spoken name
 * give the whole of each. A click opens the preview of the port. The
 * buttons wait while a preview opens, as Open preview does. `current` is
 * the port whose Preview tab shows on desktop: its row shows as the current
 * one.
 */
export function ServerRows(props: {
  servers: readonly ListeningPort[]
  disabled: boolean
  onOpen: (port: number) => void
  current?: number | null
}) {
  return (
    <ul aria-label={portFormCopy.listLabel} className={rows.rows}>
      {props.servers.map((server) => {
        const description = serverDescription(server)
        return (
          <li key={server.port}>
            <button
              aria-current={server.port === props.current ? 'page' : undefined}
              aria-label={description}
              className={classes(
                rows.row,
                styles.row,
                server.port === props.current && rows.current,
              )}
              disabled={props.disabled}
              onClick={() => props.onOpen(server.port)}
              title={description}
              type="button"
            >
              <span className={rows.number}>{server.port}</span>
              {server.name === null ? null : (
                <span className={rows.name}>{server.name}</span>
              )}
              {server.folder === null ? null : (
                <span className={rows.folder}>
                  <span dir="ltr">{server.folder}</span>
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
