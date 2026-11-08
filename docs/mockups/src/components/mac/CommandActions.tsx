import { useId } from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import styles from './CommandActions.module.css'

/**
 * The other ways to allow a command, each with what it covers (decision
 * 62). Always allow covers the exact command text on this Mac. The 15
 * minutes cover every command from this workspace on this Mac.
 */
const choices = [
  {
    label: 'Always allow',
    scope: 'This exact command, on this Mac',
    to: paths.macDone,
  },
  {
    label: 'Allow all commands for 15 minutes',
    scope: 'Every command from this workspace, on this Mac',
    to: paths.macAllowAll,
  },
] as const

/** Allow, with square end corners, so that the arrow joins it. */
function AllowButton() {
  const control = useControlSizes()
  return (
    <Button
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={noop}
      size="sm"
      style={{
        height: control.height,
        paddingHorizontal: 10,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
      tone="primary"
    >
      Allow
    </Button>
  )
}

/** The choices, each a link to its result. */
function ChoiceLinks() {
  return choices.map((choice) => (
    <ScreenLink className={styles.choice} key={choice.label} to={choice.to}>
      <span className={styles.label}>{choice.label}</span>
      <span className={styles.scope}>{choice.scope}</span>
    </ScreenLink>
  ))
}

/**
 * The other ways to allow, drawn open, because a view cannot open a
 * popover. The chat draws them outside the region of the requests, so the
 * region keeps its bound and never cuts them, and CSS places them at the
 * actions of the request that draws its arrow open.
 */
export function DrawnChoices() {
  return (
    <div className={classes(styles.choices, styles.drawn)}>
      <ChoiceLinks />
    </div>
  )
}

/**
 * Deny and Allow for a command that waits on this Mac, and the arrow
 * beside Allow that opens the other ways to allow. A view runs no script,
 * so the arrow opens the choices as a native popover in the top layer, as
 * the app does, and each choice is a link to its result. `choicesOpen`
 * draws the arrow open, and the chat draws the choices with
 * `DrawnChoices`.
 */
export function CommandActions(props: { choicesOpen?: boolean }) {
  const menu = `more-ways-${useId()}`
  const open = props.choicesOpen === true
  return (
    <>
      <ScreenLink asChild to={paths.macDenied}>
        <ActionButton>Deny</ActionButton>
      </ScreenLink>
      <span className={styles.split}>
        <ScreenLink asChild to={paths.macDone}>
          <AllowButton />
        </ScreenLink>
        <button
          aria-expanded={open ? true : undefined}
          className={styles.arrow}
          popoverTarget={open ? undefined : menu}
          title="More ways to allow"
          type="button"
        >
          <ChevronDown aria-hidden size={14} />
          <span className={a11y.hidden}>More ways to allow</span>
        </button>
        {open ? null : (
          <div className={styles.choices} id={menu} popover="auto">
            <ChoiceLinks />
          </div>
        )}
      </span>
    </>
  )
}
