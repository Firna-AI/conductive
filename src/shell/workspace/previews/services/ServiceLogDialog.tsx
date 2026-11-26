import { RotateCw } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { ServiceControlAction } from '../../../../shared/generated/ServiceControlAction'
import type { ServiceRow } from '../../../../shared/generated/ServiceRow'
import type { ServiceTarget } from '../../../../shared/generated/ServiceTarget'
import { serviceLogCopy } from '../../../../ui/components/tools/serviceCopy'
import styles from '../../../../ui/components/tools/ServiceLog.module.css'
import type { ServicesStore } from '../../../../previews/services/servicesStore'
import { ActionButton } from '../../../ui/actions'
import { ViewDialog } from '../../../ui/Dialog'
import { ServiceStatusLine } from './ServiceStatusLine'
import { useServiceLog, type LogRead } from './use-service-log'

/** The body of the log in each state of its read. */
function LogBody(props: { name: string; read: LogRead }) {
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
      // The output is one text node, so no part of it reads as markup.
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
            {read.text}
          </pre>
        </>
      )
  }
}

/**
 * The log of a service: a wide dialog on desktop, and a sheet on a phone.
 * It shows the latest state and program of the service, then the end of
 * its output as plain text, which the Worker filtered. Reload reads the end
 * again, and Try again takes its place after a failed read. `row` is the
 * latest row of the service. `target` gives the run that a read names.
 */
export function ServiceLogDialog(props: {
  row: ServiceRow
  pending: ServiceControlAction | null
  now: number
  store: ServicesStore
  target: () => ServiceTarget
  close: () => void
}) {
  const { row } = props
  const { read, reload } = useServiceLog(props.store, props.target)
  return (
    <ViewDialog
      actions={
        <>
          <ActionButton
            busy={read.kind === 'loading'}
            icon={RotateCw}
            onPress={reload}
          >
            {read.kind === 'failed'
              ? serviceLogCopy.retry
              : serviceLogCopy.reload}
          </ActionButton>
          <ActionButton onPress={props.close} tone="primary">
            {serviceLogCopy.close}
          </ActionButton>
        </>
      }
      close={props.close}
      title={serviceLogCopy.title(row.name)}
      wide
    >
      <div className={styles.state}>
        <ServiceStatusLine
          now={props.now}
          pending={props.pending}
          status={row.status}
        />
        {row.program === null ? null : (
          <span className={styles.label}>{row.program}</span>
        )}
      </div>
      <div className={styles.body}>
        <LogBody name={row.name} read={read} />
      </div>
    </ViewDialog>
  )
}
