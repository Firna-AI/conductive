import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import { useState } from 'react'
import { ChevronDown, RotateCw } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useToast } from '@firna/ui/toast'
import { useControlSizes } from '../../ui/components/common/touch'
import styles from '../../ui/components/workspace/HeaderState.module.css'
import { restartCopy } from '../../ui/components/workspace/restartCopy'
import { StatusGlyph } from '../../ui/components/workspaces/StatusGlyph'
import { activityPresentation } from '../../ui/components/workspaces/status'
import { errorMessage } from '../../app/api/client'
import { readRestartWorkspaceResponse } from '../../app/api/read-workspaces'
import { useServices } from '../../app/services'
import { nameLabel } from '../../shared/name-label'
import { workspacePaths } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import type { WorkspaceContext } from './features'
import { mayRestartSoftware } from './restart-access'

function StateText(props: { state: WorkspaceState }) {
  return (
    <>
      <StatusGlyph status={props.state} />
      {activityPresentation[props.state].label}
    </>
  )
}

/**
 * The state of the open workspace in its header. While the software of the
 * cloud computer runs, the state opens a menu with Restart, for every
 * member of an org that is not suspended. Restart restarts the agent
 * runner and the preview relay, after an update check. While an agent
 * works, it asks first. The state shows Starting from the press. A failed
 * update check and a failed restart each show a toast. Key it by the
 * workspace, so that a restart of one workspace never shows in another.
 */
export function HeaderState(props: {
  context: WorkspaceContext
  state: WorkspaceState
}) {
  const { workspace, readOnly } = props.context
  const services = useServices()
  const control = useControlSizes()
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const shown: WorkspaceState = pending ? 'starting' : props.state
  if (!mayRestartSoftware(readOnly, shown))
    return (
      <span className={styles.state}>
        <StateText state={shown} />
      </span>
    )
  const restart = () => {
    setConfirming(false)
    setPending(true)
    services.api
      .send(
        'POST',
        workspacePaths.restart(workspace.orgId, workspace.id),
        {},
        readRestartWorkspaceResponse,
      )
      .then(
        (reply) => {
          if (reply.updateCheck === 'ok') return
          toast({
            title: restartCopy.updateCheckFailed,
            description: restartCopy.updateCheckFailedBody,
            tone: 'warning',
          })
        },
        (error: unknown) => {
          toast({
            title: restartCopy.failedToast,
            description: errorMessage(error),
            tone: 'error',
          })
        },
      )
      .finally(() => setPending(false))
  }
  const entries: MenuEntry[] = [
    {
      kind: 'item',
      label: restartCopy.item,
      icon: RotateCw,
      onSelect: () =>
        props.state === 'working' ? setConfirming(true) : restart(),
    },
    { kind: 'divider' },
    { kind: 'note', text: restartCopy.note },
  ]
  const { label } = activityPresentation[shown]
  return (
    <>
      <MenuButton
        className={styles.anchor}
        entries={entries}
        label={restartCopy.menuLabel}
        placement="below-end"
        sheetTitle={nameLabel(workspace.name)}
        trigger={({ open, toggle }) => (
          <Button
            accessibilityLabel={`${label}. ${restartCopy.menuLabel} menu`}
            content={
              <span
                className={styles.state}
                style={{ fontSize: control.labelSize }}
              >
                <StateText state={shown} />
                <ChevronDown aria-hidden className={styles.chevron} size={12} />
              </span>
            }
            expanded={open}
            hasPopup="menu"
            onPress={toggle}
            size="sm"
            style={{ height: control.height, paddingHorizontal: 6 }}
            tone="plain"
          />
        )}
      />
      {confirming ? (
        <Dialog
          action={
            <ActionButton icon={RotateCw} onPress={restart} tone="primary">
              {restartCopy.confirmAction}
            </ActionButton>
          }
          busy={false}
          close={() => setConfirming(false)}
          title={restartCopy.confirmTitle}
        >
          <DialogText>{restartCopy.confirmBody}</DialogText>
        </Dialog>
      ) : null}
    </>
  )
}
