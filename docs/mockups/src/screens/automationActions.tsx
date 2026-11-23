import type { ReactElement, ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { actionButton } from '../entries/components/common/actions.mockup'
import type { Automation } from '../fixtures/automations'
import type { AutomationAccess, SaveState } from './automationState'
import styles from '../../../../src/ui/screens/AutomationScreen.module.css'

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
    moklyInstance="delete-automation"
    tone="danger"
  >
    Delete
  </actionButton.Component>
)

/**
 * The actions of the automation page, in the header on desktop and at the
 * bottom of a phone (decision 502). The owner saves, uses Run now, and
 * deletes, and a new automation has only Save. An admin turns an automation off
 * and deletes it. Every other member has none. Run now works while the
 * automation is off, and also without a trigger. It does not show on a
 * automation whose triggers are all pull request triggers (decision 510 C).
 * With no action, the page has no bar of actions.
 */
export function automationActions(props: {
  automation: Automation
  access: AutomationAccess
  save: SaveState
  viewport: Viewport
  /** The form is on the screen, so Save shows. The Runs tab of a phone has none. */
  withForm: boolean
  /** The triggers of the automation offer Run now. */
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
          {props.automation.active ? (
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
          moklyInstance="save-automation"
          tone="primary"
        >
          Save
        </actionButton.Component>,
        changed ? props.saveTo : undefined,
      )
      if (!props.automation.saved) return save
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
          moklyInstance="delete-automation"
          tone="danger"
        >
          Delete automation
        </actionButton.Component>,
        props.to,
      )}
    </div>
  )
}
