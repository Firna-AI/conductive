import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { RotateCw } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ConfirmDialog } from '../../../../../src/ui/components/common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import {
  serviceLogCopy,
  type ServiceEntry,
} from '../../../../../src/ui/components/tools/serviceCopy'
import { ServiceState } from '../../../../../src/ui/components/tools/ServiceState'
import styles from '../../../../../src/ui/components/tools/ServiceLog.module.css'

/**
 * What the log shows: the end of the output, which says when it leaves
 * earlier output out, the wait of the read, a read that failed with the
 * message of the server, or no output yet.
 */
export type ServiceLogRead =
  | { kind: 'lines'; lines: readonly string[]; omitted: boolean }
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'empty' }

function LogBody(props: { name: string; read: ServiceLogRead }) {
  const theme = useSharedUiTheme()
  const { read } = props
  switch (read.kind) {
    case 'loading':
      // A div, because the spinner is a block, which a paragraph cannot hold.
      return (
        <div className={styles.message} role="status">
          <Spinner color={theme.colors.muted} size={13} />
          {serviceLogCopy.loading}
        </div>
      )
    case 'failed':
      return (
        <p className={styles.failed} role="alert">
          <span className={styles.failedTitle}>{serviceLogCopy.failed}</span>
          {read.message}
        </p>
      )
    case 'empty':
      return (
        <p className={styles.message}>{serviceLogCopy.empty(props.name)}</p>
      )
    case 'lines':
      return (
        <>
          {read.omitted ? (
            <p className={styles.omitted}>{serviceLogCopy.omitted}</p>
          ) : null}
          <pre
            aria-label={serviceLogCopy.label(props.name)}
            className={styles.output}
            tabIndex={0}
          >
            {read.lines.join('\n')}
          </pre>
        </>
      )
  }
}

/**
 * The log of a service: a dialog on desktop and a sheet on a phone. It
 * shows the state of the service, then the end of its output as plain
 * text, which the cloud computer filters. Reload reads the end again, and
 * Try again takes its place after a failed read. `closeTo` is the screen
 * of Close: the list under the log.
 */
export function ServiceLogView(props: {
  service: ServiceEntry
  read: ServiceLogRead
  viewport: Viewport
  closeTo: string
}) {
  const { service, read } = props
  const failed = read.kind === 'failed'
  return (
    <ConfirmDialog
      actions={
        <>
          <ActionButton busy={read.kind === 'loading'} icon={RotateCw}>
            {failed ? serviceLogCopy.retry : serviceLogCopy.reload}
          </ActionButton>
          <ScreenLink asChild to={props.closeTo}>
            <ActionButton tone="primary">{serviceLogCopy.close}</ActionButton>
          </ScreenLink>
        </>
      }
      title={serviceLogCopy.title(service.name)}
      viewport={props.viewport}
      wide
    >
      <div className={styles.state}>
        <ServiceState phase={service.phase} />
        {service.label === null ? null : (
          <span className={styles.label}>{service.label}</span>
        )}
      </div>
      <div className={styles.body}>
        <LogBody name={service.name} read={read} />
      </div>
    </ConfirmDialog>
  )
}
