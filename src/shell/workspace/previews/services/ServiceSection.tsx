import { useState } from 'react'
import { useToast } from '@firna/ui/toast'
import type { ServiceCatalogueSnapshot } from '../../../../shared/generated/ServiceCatalogueSnapshot'
import type { ServiceControlAction } from '../../../../shared/generated/ServiceControlAction'
import type { ServiceRow } from '../../../../shared/generated/ServiceRow'
import type { ServiceTarget } from '../../../../shared/generated/ServiceTarget'
import { servicesCopy } from '../../../../ui/components/tools/serviceCopy'
import styles from '../../../../ui/components/tools/ServiceList.module.css'
import { useNow } from '../../../../app/time'
import type { ServicePorts } from '../../../../previews/services/servicesPart'
import {
  runKey,
  type ServicesState,
  type ServicesView,
} from '../../../../previews/services/servicesState'
import type { ServicesStore } from '../../../../previews/services/servicesStore'
import { LoadFailure } from '../../../ui/LoadFailure'
import { ServiceItem } from './ServiceItem'
import { ServiceLogDialog } from './ServiceLogDialog'
import { showServiceAnswer } from './service-toasts'
import { StopServiceQuestion } from './StopServiceQuestion'

/** The relative times of the rows move on at this interval, in ms. */
const timeTick = 30_000

function targetOf(bootId: string, row: ServiceRow): ServiceTarget {
  return { bootId, serviceId: row.serviceId, generation: row.generation }
}

/**
 * The Services part of the Preview tool, above its servers: the rows of the
 * report in the order of their names, one line when the report holds no
 * service, or the notice of a first read that failed, with Try again. The
 * Stop question and the log open over it. Each control names the run that
 * the member saw.
 */
export function ServiceSection(props: {
  view: Exclude<ServicesView, { kind: 'none' }>
  state: ServicesState
  store: ServicesStore
  /** The viewer may Stop and Restart, under the rule of Restart in the header. */
  controls: boolean
  ports: ServicePorts
  sessionHref: (sessionId: string) => string
}) {
  const { view, store, state } = props
  const { toast } = useToast()
  const now = useNow(timeTick)
  /** The run of the Stop question, as the member saw it. */
  const [stopping, setStopping] = useState<{
    name: string
    target: ServiceTarget
  } | null>(null)
  // A viewer who loses the right to stop, such as in an org that becomes
  // suspended, gets no Stop question. The end of the right ends it.
  const [allowed, setAllowed] = useState(props.controls)
  if (allowed !== props.controls) {
    setAllowed(props.controls)
    if (!props.controls) setStopping(null)
  }
  /** The service of the open log, as the member saw it at the open. */
  const [logOf, setLogOf] = useState<{
    row: ServiceRow
    bootId: string
  } | null>(null)
  const snapshot: ServiceCatalogueSnapshot | null =
    view.kind === 'list' ? view.snapshot : null
  const pendingOf = (target: ServiceTarget) =>
    state.pending.get(runKey(target)) ?? null
  const send = (
    name: string,
    target: ServiceTarget,
    action: ServiceControlAction,
  ) =>
    store.control(target, action, (answer) =>
      showServiceAnswer(toast, action, name, answer),
    )
  // The open log follows the latest row of its service while the list has it.
  const logRow = logOf
    ? (snapshot?.services.find(
        (row) => row.serviceId === logOf.row.serviceId,
      ) ?? logOf.row)
    : null
  const logTarget = () =>
    logOf && logRow ? targetOf(snapshot?.bootId ?? logOf.bootId, logRow) : null

  let content
  if (view.kind === 'failed') {
    content = (
      <div className={styles.failure}>
        <LoadFailure
          error={view.error}
          retry={store.refresh}
          title={servicesCopy.loadFailed}
        />
      </div>
    )
  } else if (view.snapshot.services.length === 0) {
    content = <p className={styles.hint}>{servicesCopy.empty}</p>
  } else {
    const { bootId } = view.snapshot
    content = (
      <ul aria-label={servicesCopy.listLabel} className={styles.rows}>
        {view.snapshot.services.map((row) => (
          <ServiceItem
            actions={{
              restart: () => send(row.name, targetOf(bootId, row), 'restart'),
              stop: () =>
                setStopping({ name: row.name, target: targetOf(bootId, row) }),
              showLog: () => setLogOf({ row, bootId }),
            }}
            controls={props.controls}
            key={row.serviceId}
            now={now}
            pending={pendingOf(targetOf(bootId, row))}
            ports={props.ports}
            row={row}
            sessionHref={props.sessionHref}
          />
        ))}
      </ul>
    )
  }
  const logAt = logTarget()
  return (
    <section aria-label={servicesCopy.heading} className={styles.section}>
      <h3 className={styles.heading}>{servicesCopy.heading}</h3>
      {content}
      {stopping && props.controls ? (
        <StopServiceQuestion
          close={() => setStopping(null)}
          name={stopping.name}
          stop={() => {
            setStopping(null)
            send(stopping.name, stopping.target, 'stop')
          }}
        />
      ) : null}
      {logRow && logAt ? (
        <ServiceLogDialog
          close={() => setLogOf(null)}
          now={now}
          pending={pendingOf(logAt)}
          row={logRow}
          store={store}
          target={() => logTarget() ?? logAt}
        />
      ) : null}
    </section>
  )
}
