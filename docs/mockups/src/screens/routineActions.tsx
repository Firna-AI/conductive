import type { ReactElement, ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { actionButton } from '../entries/components/common/actions.mockup'
import type { Routine } from '../fixtures/routines'
import type { RoutineAccess, SaveState } from './routineState'
import styles from './RoutineScreen.module.css'

/** An action that opens a screen of the mockups, when they draw one. */
function linked(button: ReactElement, to: string | undefined): ReactElement {
  if (!to) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

const deleteButton = (
  <actionButton.Component
    icon="trash-2"
    moklyInstance="delete-routine"
    tone="danger"
  >
    Delete
  </actionButton.Component>
)

/**
 * The actions of the routine page, in the header on desktop and at the
 * bottom of a phone (decision 502). The owner saves, uses Run now, and
 * deletes, and a new routine has only Save. An admin turns a routine off
 * and deletes it. Every other member has none. Run now works while the
 * routine is off, and also without a trigger. It does not show on a
 * routine whose triggers are all pull request triggers (decision 510 C).
 * With no action, the page has no bar of actions.
 */
export function routineActions(props: {
  routine: Routine
  access: RoutineAccess
  save: SaveState
  viewport: Viewport
  /** The form is on the screen, so Save shows. The Runs tab of a phone has none. */
  withForm: boolean
  /** The triggers of the routine offer Run now. */
  runNow: boolean
  /** The screen after Save, when the mockups draw it. */
  saveTo?: string
  /** The screen after Run now, when the mockups draw it. */
  runNowTo?: string
  /** The question of Delete, when the mockups draw it. */
  deleteTo?: string
}): ReactNode {
  switch (props.access) {
    case 'member':
      return null
    case 'admin':
      return (
        <>
          {props.routine.active ? (
            <actionButton.Component icon="power" moklyInstance="turn-off">
              Turn off
            </actionButton.Component>
          ) : null}
          {deleteButton}
        </>
      )
    case 'owner': {
      const changed = props.save === 'changed'
      const save = linked(
        <actionButton.Component
          disabled={!changed}
          moklyInstance="save-routine"
          tone="primary"
        >
          Save
        </actionButton.Component>,
        changed ? props.saveTo : undefined,
      )
      if (!props.routine.saved) return save
      const runNow = props.runNow
        ? linked(
            <actionButton.Component icon="play" moklyInstance="run-now">
              Run now
            </actionButton.Component>,
            props.runNowTo,
          )
        : null
      if (!runNow && !props.withForm) return null
      return (
        <>
          {props.viewport === 'desktop'
            ? linked(deleteButton, props.deleteTo)
            : null}
          {runNow}
          {props.withForm ? save : null}
        </>
      )
    }
  }
}

/**
 * The owner's Delete on a phone, at the end of the form. `to` is its
 * question, when the mockups draw it.
 */
export function PhoneDelete(props: { to?: string }) {
  return (
    <div className={styles.phoneDelete}>
      {linked(
        <actionButton.Component
          icon="trash-2"
          moklyInstance="delete-routine"
          tone="danger"
        >
          Delete routine
        </actionButton.Component>,
        props.to,
      )}
    </div>
  )
}
