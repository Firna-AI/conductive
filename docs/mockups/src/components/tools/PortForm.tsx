import { InputFrame } from '@firna/ui/input'
import type { ListeningPort } from '../../../../../src/shared/generated/ListeningPort'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { portFormCopy, serverDescription } from './previewCopy'
import styles from './PortForm.module.css'

/** The port field and Open preview, primary alone or secondary under a list. */
function PortField(props: { label: string; placeholder: string }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.port}>
      <InputFrame
        accessibilityLabel={props.label}
        inputMode="numeric"
        onChangeText={noop}
        placeholder={props.placeholder}
        size={field}
        value=""
      />
    </div>
  )
}

/**
 * One detected server: a button with its port, its name, and its folder.
 * A folder that does not fit keeps its end, after "…". A click opens the
 * preview of the port.
 */
function ServerRow(props: { server: ListeningPort }) {
  const { server } = props
  const description = serverDescription(server)
  return (
    <li>
      <ScreenLink asChild to={paths.preview}>
        <button
          aria-label={description}
          className={styles.row}
          title={description}
          type="button"
        >
          <span className={styles.number}>{server.port}</span>
          {server.name === null ? null : (
            <span className={styles.name}>{server.name}</span>
          )}
          {server.folder === null ? null : (
            <span className={styles.folder}>
              <span dir="ltr">{server.folder}</span>
            </span>
          )}
        </button>
      </ScreenLink>
    </li>
  )
}

/**
 * The port form with the servers of the sandbox, and the smaller Other port
 * row under them. The list scrolls when it does not fit.
 */
export function ServerList(props: { servers: readonly ListeningPort[] }) {
  return (
    <div className={styles.list}>
      <p className={styles.intro}>{portFormCopy.body}</p>
      <ul aria-label={portFormCopy.listLabel} className={styles.rows}>
        {props.servers.map((server) => (
          <ServerRow key={server.port} server={server} />
        ))}
      </ul>
      <div className={styles.other}>
        <span aria-hidden className={styles.otherLabel}>
          {portFormCopy.otherPort}
        </span>
        <PortField label={portFormCopy.otherPort} placeholder="8080" />
        <actionButton.Component moklyInstance="open-other-port">
          {portFormCopy.open}
        </actionButton.Component>
      </div>
    </div>
  )
}

/**
 * The port form without a list: the field under a short message. The
 * message asks for a server when the runner reports none, and reads as
 * before when the app has no report.
 */
export function PortMessage(props: { body: string }) {
  return (
    <emptyState.Component
      moklyInstance="port-message"
      action={
        <div className={styles.open}>
          <PortField label="Port" placeholder="3000" />
          <actionButton.Component moklyInstance="open-port" tone="primary">
            {portFormCopy.open}
          </actionButton.Component>
        </div>
      }
      body={props.body}
      icon="globe"
      title={portFormCopy.title}
    />
  )
}
