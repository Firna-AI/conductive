import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
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

/**
 * Deny and Allow for a command that waits on this Mac, and the arrow
 * beside Allow that opens the other ways to allow. A view runs no script,
 * so the arrow is a native disclosure, and each choice is a link to its
 * result. `choicesOpen` draws the choices open.
 */
export function CommandActions(props: { choicesOpen?: boolean }) {
  return (
    <>
      <ScreenLink asChild to={paths.macDenied}>
        <ActionButton>Deny</ActionButton>
      </ScreenLink>
      <span className={styles.split}>
        <ScreenLink asChild to={paths.macDone}>
          <AllowButton />
        </ScreenLink>
        <details className={styles.more} open={props.choicesOpen}>
          <summary className={styles.arrow} title="More ways to allow">
            <ChevronDown aria-hidden size={14} />
            <span className={a11y.hidden}>More ways to allow</span>
          </summary>
          <div className={styles.choices}>
            {choices.map((choice) => (
              <ScreenLink
                className={styles.choice}
                key={choice.label}
                to={choice.to}
              >
                <span className={styles.label}>{choice.label}</span>
                <span className={styles.scope}>{choice.scope}</span>
              </ScreenLink>
            ))}
          </div>
        </details>
      </span>
    </>
  )
}
