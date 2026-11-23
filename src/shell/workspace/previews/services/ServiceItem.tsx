import { useEffect, useState } from 'react'
import {
  MessageSquare,
  MoreHorizontal,
  RotateCw,
  ScrollText,
  Square,
  SquareTerminal,
} from 'lucide-react'
import type { ServiceControlAction } from '../../../../shared/generated/ServiceControlAction'
import type { ServiceRow } from '../../../../shared/generated/ServiceRow'
import type { ServiceSource } from '../../../../shared/generated/ServiceSource'
import a11y from '../../../../ui/components/common/a11y.module.css'
import { classes } from '../../../../ui/components/common/classes'
import {
  serviceControlCopy,
  serviceDescription,
  servicesCopy,
  serviceSourceLabel,
  serviceSourceText,
} from '../../../../ui/components/tools/serviceCopy'
import styles from '../../../../ui/components/tools/ServiceList.module.css'
import type { ServicePorts } from '../../../../previews/services/servicesPart'
import { IconButton } from '../../../ui/actions'
import { AppLink } from '../../../ui/AppLink'
import { MenuButton, type MenuEntry } from '../../../ui/Menu'
import { ServiceStatusLine } from './ServiceStatusLine'

/** What the controls of a row do with its service. */
export interface ServiceItemActions {
  restart: (row: ServiceRow) => void
  stop: (row: ServiceRow) => void
  showLog: (row: ServiceRow) => void
}

/** The ports of a service, as small buttons that open their previews. */
function PortButtons(props: { ports: readonly number[]; at: ServicePorts }) {
  const { at } = props
  if (props.ports.length === 0) {
    return <span className={styles.noPort}>{servicesCopy.noPort}</span>
  }
  return props.ports.map((port) => (
    <button
      aria-current={port === at.current ? 'page' : undefined}
      aria-label={serviceControlCopy.port(port)}
      className={classes(styles.port, port === at.current && styles.current)}
      disabled={at.opening}
      key={port}
      onClick={() => at.onOpen(port)}
      type="button"
    >
      {port}
    </button>
  ))
}

/**
 * Where the service started: the session that the workspace matched, as a
 * link to it, or Local command. Screen readers hear "Started in the
 * session" before the title. The source gives no right.
 */
function SourceLine(props: {
  source: ServiceSource
  sessionHref: (sessionId: string) => string
}) {
  const { source } = props
  const session = source.kind === 'session'
  const Icon = session ? MessageSquare : SquareTerminal
  const content = (
    <>
      <Icon aria-hidden className={styles.sourceIcon} size={11} />
      {session ? (
        <span className={a11y.hidden}>{servicesCopy.sessionSource} </span>
      ) : null}
      <span className={styles.sourceText}>{serviceSourceText(source)}</span>
    </>
  )
  if (source.kind !== 'session') {
    return <span className={styles.source}>{content}</span>
  }
  return (
    <AppLink
      className={styles.source}
      title={serviceSourceLabel(source)}
      to={props.sessionHref(source.sessionId)}
    >
      {content}
    </AppLink>
  )
}

/** Tells the row when its menu opens and closes, so the row keeps its fill. */
function MenuOpen(props: { open: boolean; onChange: (open: boolean) => void }) {
  const { open, onChange } = props
  useEffect(() => onChange(open), [open, onChange])
  return null
}

/**
 * One service in three lines. The first holds its name, the label of its
 * program, and its folder, which shorten, then Show log, and with the right
 * to restart the software, the menu with Restart and Stop. The second holds
 * its state, the time, and where it started. The last holds every port, and
 * wraps. A control that runs turns the menu off. Each name, label, and
 * title shows as plain text.
 */
export function ServiceItem(props: {
  row: ServiceRow
  pending: ServiceControlAction | null
  controls: boolean
  now: number
  ports: ServicePorts
  sessionHref: (sessionId: string) => string
  actions: ServiceItemActions
}) {
  const { row, actions } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const entries: MenuEntry[] = [
    {
      kind: 'item',
      label: servicesCopy.restart,
      icon: RotateCw,
      onSelect: () => actions.restart(row),
    },
    {
      kind: 'item',
      label: servicesCopy.stop,
      icon: Square,
      tone: 'danger',
      disabled: row.status.state !== 'running',
      onSelect: () => actions.stop(row),
    },
  ]
  return (
    <li
      className={classes(
        styles.service,
        menuOpen && props.controls && styles.open,
      )}
    >
      <div className={styles.top}>
        <span
          className={styles.what}
          title={serviceDescription(row.name, row.program, row.folder)}
        >
          <span className={styles.name}>{row.name}</span>
          {row.program === null ? null : (
            <span className={styles.label}>{row.program}</span>
          )}
          {row.folder === null ? null : (
            <span className={styles.folder}>
              <span dir="ltr">{row.folder}</span>
            </span>
          )}
        </span>
        <span className={styles.end}>
          <IconButton
            icon={ScrollText}
            label={serviceControlCopy.showLog(row.name)}
            onPress={() => actions.showLog(row)}
            quiet
          />
          {props.controls ? (
            <MenuButton
              entries={entries}
              label={row.name}
              placement="below-end"
              trigger={({ open, toggle }) => (
                <span className={classes(styles.more, open && styles.moreOpen)}>
                  <MenuOpen onChange={setMenuOpen} open={open} />
                  <IconButton
                    disabled={props.pending !== null}
                    expanded={open}
                    icon={MoreHorizontal}
                    label={serviceControlCopy.more(row.name)}
                    menu
                    onPress={toggle}
                    quiet
                  />
                </span>
              )}
            />
          ) : null}
        </span>
      </div>
      <div className={styles.meta}>
        <ServiceStatusLine
          now={props.now}
          pending={props.pending}
          status={row.status}
        />
        <SourceLine sessionHref={props.sessionHref} source={row.source} />
      </div>
      <div className={styles.ports}>
        <PortButtons at={props.ports} ports={row.ports} />
      </div>
    </li>
  )
}
