import type { ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Globe } from 'lucide-react'
import type { ListeningPort } from '../../../../../src/shared/generated/ListeningPort'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { EmptyState } from '../common/EmptyState'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { portFormCopy, serverDescription } from './previewCopy'
import { servicesCopy } from './serviceCopy'
import { ToolHeading } from './ServiceList'
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
 * preview of the port. On desktop it shows the Preview tab of the port
 * (decision 291), and the row of the shown tab is the current one.
 */
function ServerRow(props: { server: ListeningPort; current: boolean }) {
  const { server } = props
  const description = serverDescription(server)
  return (
    <li>
      <ScreenLink asChild to={paths.preview}>
        <button
          aria-current={props.current ? 'page' : undefined}
          aria-label={description}
          className={classes(styles.row, props.current && styles.current)}
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
 * row under them. The list scrolls when it does not fit. `current` is the
 * port of the Preview tab that shows, on desktop. `services` lies above
 * the servers, in the same scroll, and then the servers take a heading.
 */
export function ServerList(props: {
  servers: readonly ListeningPort[]
  current?: number | null
  services?: ReactNode
}) {
  return (
    <div className={styles.list}>
      {props.services ? (
        <>
          {props.services}
          <ToolHeading>{servicesCopy.serversHeading}</ToolHeading>
        </>
      ) : null}
      <p className={styles.intro}>{portFormCopy.body}</p>
      <ul aria-label={portFormCopy.listLabel} className={styles.rows}>
        {props.servers.map((server) => (
          <ServerRow
            current={server.port === props.current}
            key={server.port}
            server={server}
          />
        ))}
      </ul>
      <div className={styles.other}>
        <span aria-hidden className={styles.otherLabel}>
          {portFormCopy.otherPort}
        </span>
        <PortField label={portFormCopy.otherPort} placeholder="8080" />
        <ActionButton>{portFormCopy.open}</ActionButton>
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
    <EmptyState
      action={
        <div className={styles.open}>
          <PortField label="Port" placeholder="3000" />
          <ActionButton tone="primary">{portFormCopy.open}</ActionButton>
        </div>
      }
      body={props.body}
      icon={Globe}
      title={portFormCopy.title}
    />
  )
}
