import type { Viewport } from '@mokly/mokly'
import { LockOpen } from 'lucide-react'
import {
  suspendedOrgTarget,
  suspendedUser,
  type Suspension,
} from '../../fixtures/operator'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { targetName } from './Suspensions'

/** The suspended target of each kind of lift. */
const targets: Readonly<Record<Suspension['kind'], Suspension>> = {
  user: suspendedUser,
  org: suspendedOrgTarget,
}

/** What a lift gives back, for each kind of target. */
function givesBack(target: Suspension): string {
  return target.kind === 'user'
    ? `${targetName(target)} can sign in again, and their workspaces can start again.`
    : `Members can change ${target.name} again, and its workspaces can start again.`
}

/**
 * The operator confirms a lift. The dialog says what comes back, and that
 * the files of a workspace that stopped 14 days ago or more can be gone.
 */
export function LiftDialog(props: {
  kind: Suspension['kind']
  viewport: Viewport
}) {
  const target = targets[props.kind]
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.operator}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.operator}>
            <ActionButton icon={LockOpen} tone="primary">
              Lift suspension
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Lift the suspension of ${targetName(target)}?`}
      viewport={props.viewport}
    >
      <DialogText>{givesBack(target)}</DialogText>
      <DialogText>
        A workspace that stopped 14 days ago or more may have lost its files.
      </DialogText>
    </ConfirmDialog>
  )
}
