import { Fragment, type ReactElement } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Input } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ArrowRight, Copy, KeyRound } from 'lucide-react'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { addComputerWords as words } from './addComputerCopy'
import type { ComputerResources } from './ownComputer'
import styles from './AddComputerDialog.module.css'

/**
 * The step of Add computer: the name, the install command while the app
 * waits for the first connection, the first connection, or a one-time
 * code that expired before the computer connected.
 */
export type AddStep = 'name' | 'command' | 'connected' | 'expired'

/** The screens that the actions of the dialog open, in the mockups. */
export type AddComputerLinks = {
  list: string
  command: string
  waiting: string
}

/** A button, as a link to its screen. */
function Linked(props: { to: string; children: ReactElement }) {
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * A word of the command that stays on one line, such as `-s`, so that a
 * line of the box never ends inside a flag. A long word, such as an
 * address, can still break to fit the box.
 */
const keptWord = 24

/** The install command in the mono type, with Copy. */
function CommandBox(props: { command: string }) {
  const parts = props.command.split(' ')
  return (
    <div className={styles.command}>
      <code className={styles.commandText}>
        {parts.map((part, index) => (
          <Fragment key={`${index}-${part}`}>
            {index > 0 ? ' ' : null}
            <span className={part.length <= keptWord ? styles.word : undefined}>
              {part}
            </span>
          </Fragment>
        ))}
      </code>
      <IconButton icon={Copy} label={words.copy} />
    </div>
  )
}

/** The wait for the first connection, with a spinner. */
function Waiting(props: { name: string }) {
  const theme = useSharedUiTheme()
  return (
    <div className={styles.waiting} role="status">
      <Spinner color={theme.colors.primary} size={13} />
      {words.waiting(props.name)}
    </div>
  )
}

/** The name of the new computer, as an admin types it. */
function NameField(props: { name: string }) {
  const { field } = useControlSizes()
  return (
    <Input
      autoComplete="off"
      hint={words.nameHint}
      label={words.name}
      onChangeText={noop}
      size={field}
      value={props.name}
    />
  )
}

/**
 * Add computer, drawn open over the Own computers tab: a dialog on a
 * computer and a sheet on a phone. An admin names the computer, then runs
 * the one-line install command with its one-time code on the server. The
 * dialog waits for the first connection, and Close keeps the code until
 * it expires. A computer that never connected within 1 hour gets a new
 * code. `connected` holds what the computer reported at its first
 * connection, with the limit that the app set from it.
 */
export function AddComputerDialog(props: {
  step: AddStep
  org: string
  name: string
  command: string
  connected?: { resources: ComputerResources; limit: number }
  links: AddComputerLinks
  viewport: Viewport
}) {
  const { links, name, viewport } = props
  switch (props.step) {
    case 'name':
      return (
        <ConfirmDialog
          actions={
            <>
              <Linked to={links.list}>
                <ActionButton>{words.cancel}</ActionButton>
              </Linked>
              <Linked to={links.command}>
                <ActionButton icon={ArrowRight} tone="primary">
                  {words.continue}
                </ActionButton>
              </Linked>
            </>
          }
          title={words.title}
          viewport={viewport}
        >
          <DialogText>{words.body(props.org)}</DialogText>
          <NameField name={name} />
          <p className={styles.note}>{words.trust}</p>
        </ConfirmDialog>
      )
    case 'command':
      return (
        <ConfirmDialog
          actions={
            <Linked to={links.waiting}>
              <ActionButton>{words.close}</ActionButton>
            </Linked>
          }
          title={words.installTitle(name)}
          viewport={viewport}
          wide
        >
          <DialogText>{words.installBody}</DialogText>
          <CommandBox command={props.command} />
          <p className={styles.note}>
            {words.codeNote} {words.needs}
          </p>
          <Waiting name={name} />
        </ConfirmDialog>
      )
    case 'connected':
      return (
        <ConfirmDialog
          actions={
            <Linked to={links.list}>
              <ActionButton tone="primary">{words.done}</ActionButton>
            </Linked>
          }
          title={words.connectedTitle(name)}
          viewport={viewport}
        >
          <DialogText>{words.connectedBody(props.org)}</DialogText>
          {props.connected ? (
            <DialogText>
              {words.connectedLimit(
                name,
                props.connected.limit,
                props.connected.resources,
              )}
            </DialogText>
          ) : null}
        </ConfirmDialog>
      )
    case 'expired':
      return (
        <ConfirmDialog
          actions={
            <>
              <ActionButton>{words.remove(name)}</ActionButton>
              <Linked to={links.command}>
                <ActionButton icon={KeyRound} tone="primary">
                  {words.newCode}
                </ActionButton>
              </Linked>
            </>
          }
          title={words.expiredTitle}
          viewport={viewport}
        >
          <DialogText>{words.expiredBody(name)}</DialogText>
        </ConfirmDialog>
      )
  }
}
