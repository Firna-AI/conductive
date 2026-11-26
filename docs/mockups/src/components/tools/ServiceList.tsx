import type { ReactElement } from 'react'
import {
  MessageSquare,
  MoreHorizontal,
  ScrollText,
  SquareTerminal,
} from 'lucide-react'
import { loadFailure } from '../../entries/components/common/LoadFailure.mockup'
import { paths } from '../../paths'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Menu } from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import {
  serviceControlCopy,
  serviceDescription,
  servicesCopy,
  serviceSourceLabel,
  serviceSourceText,
  type ServiceEntry,
} from '../../../../../src/ui/components/tools/serviceCopy'
import { serviceMenu } from './serviceMenu'
import {
  ServiceState,
  serviceStatusOf,
} from '../../../../../src/ui/components/tools/ServiceState'
import styles from '../../../../../src/ui/components/tools/ServiceList.module.css'

/**
 * The screens that the controls of a row lead to, where the mockups draw
 * them: its menu, its log, and the session that started it.
 */
export type ServiceLinks = { menu?: string; log?: string; source?: string }

/** The open menu of a row: drawn beside its button, or as a phone sheet. */
export type OpenServiceMenu = { name: string; anchored: boolean }

/** A link to a screen when the mockups draw it, or else the control alone. */
function Linked(props: { to?: string; children: ReactElement }) {
  if (props.to === undefined) return props.children
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * The ports of a service as small buttons that open their previews. The
 * port of the Preview tab that shows is the current one.
 */
function ServicePorts(props: {
  ports: readonly number[]
  current: number | null
}) {
  if (props.ports.length === 0) {
    return <span className={styles.noPort}>{servicesCopy.noPort}</span>
  }
  return (
    <>
      {props.ports.map((port) => (
        <ScreenLink asChild key={port} to={paths.preview}>
          <button
            aria-current={port === props.current ? 'page' : undefined}
            aria-label={serviceControlCopy.port(port)}
            className={classes(
              styles.port,
              port === props.current && styles.current,
            )}
            type="button"
          >
            {port}
          </button>
        </ScreenLink>
      ))}
    </>
  )
}

/**
 * Where the service started: a session, as a link to it, or Local command.
 * Screen readers hear "Started in the session" before a session title.
 */
function ServiceSourceLine(props: { service: ServiceEntry; to?: string }) {
  const { source } = props.service
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
  if (props.to === undefined) {
    return <span className={styles.source}>{content}</span>
  }
  return (
    <ScreenLink
      className={styles.source}
      title={serviceSourceLabel(source)}
      to={props.to}
    >
      {content}
    </ScreenLink>
  )
}

/**
 * One service in three lines. The first holds its name, the label of its
 * program and its folder, which shorten, then Show log, and with the right
 * to restart the software, the menu with Restart and Stop, which always
 * keep their place. The second holds its state, the time, and where it
 * started. The last holds every port, and wraps when the ports do not fit
 * in one line. A control that runs turns the menu off.
 */
function ServiceRow(props: {
  service: ServiceEntry
  current: number | null
  controls: boolean
  links: ServiceLinks
  menu?: OpenServiceMenu
}) {
  const { service, links } = props
  const open = props.menu?.name === service.name
  const pending = serviceStatusOf(service.phase.kind).busy
  const description = serviceDescription(
    service.name,
    service.label,
    service.folder,
  )
  return (
    <li className={classes(styles.service, open && styles.open)}>
      <div className={styles.top}>
        <span className={styles.what} title={description}>
          <span className={styles.name}>{service.name}</span>
          {service.label === null ? null : (
            <span className={styles.label}>{service.label}</span>
          )}
          {service.folder === null ? null : (
            <span className={styles.folder}>
              <span dir="ltr">{service.folder}</span>
            </span>
          )}
        </span>
        <span className={styles.end}>
          <Linked to={links.log}>
            <IconButton
              icon={ScrollText}
              label={serviceControlCopy.showLog(service.name)}
              quiet
            />
          </Linked>
          {props.controls ? (
            <span className={classes(styles.more, open && styles.moreOpen)}>
              <Linked to={pending || open ? undefined : links.menu}>
                <IconButton
                  disabled={pending}
                  expanded={open}
                  icon={MoreHorizontal}
                  label={serviceControlCopy.more(service.name)}
                  menu
                  quiet
                />
              </Linked>
              {open && props.menu?.anchored ? (
                <Menu
                  entries={serviceMenu(service.phase)}
                  label={service.name}
                  placement="below-end"
                />
              ) : null}
            </span>
          ) : null}
        </span>
      </div>
      <div className={styles.meta}>
        <ServiceState phase={service.phase} />
        <ServiceSourceLine service={service} to={links.source} />
      </div>
      <div className={styles.ports}>
        <ServicePorts current={props.current} ports={service.ports} />
      </div>
    </li>
  )
}

/** The heading of a part of the Preview tool: Services, or Servers. */
export function ToolHeading(props: { children: string }) {
  return <h3 className={styles.heading}>{props.children}</h3>
}

/**
 * The services of the report, above the servers of the Preview tool. With
 * no service yet, a line says what a service is for. After a first read of
 * the list that failed, the notice of data that did not load takes the
 * place of the rows, with the message of the server and Try again.
 * `current` is the port of the Preview tab that shows, on desktop.
 */
export function ServiceSection(props: {
  services: readonly ServiceEntry[]
  current: number | null
  controls: boolean
  linksFor: (service: ServiceEntry) => ServiceLinks
  menu?: OpenServiceMenu
  /** A first read that failed, and the screen of the list after Try again. */
  failed?: { retryTo: string }
}) {
  return (
    <section aria-label={servicesCopy.heading} className={styles.section}>
      <ToolHeading>{servicesCopy.heading}</ToolHeading>
      {props.failed ? (
        <div className={styles.failure}>
          <loadFailure.Component
            moklyInstance="services-load-failure"
            title={servicesCopy.loadFailed}
            to={props.failed.retryTo}
          />
        </div>
      ) : props.services.length === 0 ? (
        <p className={styles.hint}>{servicesCopy.empty}</p>
      ) : (
        <ul aria-label={servicesCopy.listLabel} className={styles.rows}>
          {props.services.map((service) => (
            <ServiceRow
              controls={props.controls}
              current={props.current}
              key={service.name}
              links={props.linksFor(service)}
              menu={props.menu}
              service={service}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
