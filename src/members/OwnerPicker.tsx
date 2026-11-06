import { useCallback, useRef, useState } from 'react'
import type { OrgMember } from '../shared/members'
import type { Workspace } from '../shared/workspaces'
import { errorMessage, type MembersApi } from './api/client'
import { OwnerButton, ReadOnlyOwner } from './OwnerButton'
import { personName } from './people'
import { useMountedRef } from './useMounted'
import { ChoiceMenu } from './ui/ChoiceMenu'
import { ViewportScope, type Viewport } from './ui/controls'
import { PersonAvatar } from './ui/PersonAvatar'

/** Each message runs on its sender's login (decision 49). */
const loginNote = "Each message runs on its sender's own agent login."

type Members =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; members: readonly OrgMember[] }

export type OwnerPickerProps = {
  api: MembersApi
  workspace: Workspace
  /** The signed-in person is an admin of the org. */
  canReassign: boolean
  viewport: Viewport
  /** The owner changed. The workspace is the API's answer. */
  onReassigned: (workspace: Workspace) => void
}

/** The line in place of the members while they load or after a failure. */
function statusText(members: Members): string | undefined {
  if (members.status === 'loading') return 'Loading the members'
  if (members.status === 'failed') return 'The members did not load.'
  return undefined
}

/**
 * The owner of a workspace, for its header: the avatar and the name, or the
 * avatar alone on a phone. An admin opens a menu of every member of the org,
 * with the current owner checked, and picks another owner. A phone shows the
 * menu as a sheet. A new owner changes no login and does not restart the
 * cloud computer. A member who is not an admin sees the owner only.
 *
 * The picker keys its state to the workspace, its org, and `canReassign`.
 * When one of them changes, the menu closes and the list of members goes.
 * The answers of older requests then change nothing and call no callback.
 */
export function OwnerPicker(props: OwnerPickerProps) {
  const { workspace } = props
  const scope = `${workspace.orgId}/${workspace.id}/${props.canReassign}`
  return <ScopedOwnerPicker key={scope} {...props} />
}

function ScopedOwnerPicker(props: OwnerPickerProps) {
  const { api, workspace } = props
  const compact = props.viewport === 'mobile'
  const mounted = useMountedRef()
  const loads = useRef(0)
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Members>({ status: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next)
      setError(null)
      if (!next) return
      // A list that loaded before stays while the menu loads it again.
      setMembers((current) =>
        current.status === 'failed' ? { status: 'loading' } : current,
      )
      // Only the newest load of a mounted picker changes the list.
      const load = ++loads.current
      const newest = () => mounted.current && load === loads.current
      api.members(workspace.orgId).then(
        (response) => {
          if (newest())
            setMembers({ status: 'ready', members: response.members })
        },
        (reason: unknown) => {
          if (newest())
            setMembers({ status: 'failed', message: errorMessage(reason) })
        },
      )
    },
    [api, workspace.orgId, mounted],
  )

  async function select(userId: string) {
    if (userId === workspace.owner.id) {
      setOpen(false)
      return
    }
    setBusy(userId)
    setError(null)
    try {
      const updated = await api.reassignWorkspace(
        workspace.orgId,
        workspace.id,
        {
          userId,
        },
      )
      if (!mounted.current) return
      setOpen(false)
      props.onReassigned(updated)
    } catch (reason) {
      if (mounted.current) {
        setError(`The owner did not change. ${errorMessage(reason)}`)
      }
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  if (!props.canReassign) {
    return (
      <ViewportScope inline viewport={props.viewport}>
        <ReadOnlyOwner compact={compact} workspace={workspace} />
      </ViewportScope>
    )
  }
  const list = members.status === 'ready' ? members.members : []
  return (
    <ViewportScope inline viewport={props.viewport}>
      <ChoiceMenu
        busy={busy}
        choices={list.map((member) => ({
          value: member.user.id,
          label: personName(member.user),
          mark: <PersonAvatar person={member.user} size={18} />,
        }))}
        error={
          members.status === 'failed' ? members.message : (error ?? undefined)
        }
        group="Owner"
        label="Owner"
        note={loginNote}
        onOpenChange={changeOpen}
        onSelect={(userId) => void select(userId)}
        open={open}
        placement="below-end"
        selected={workspace.owner.id}
        sheetTitle={workspace.name}
        status={statusText(members)}
        trigger={(trigger) => (
          <OwnerButton
            busy={busy !== null}
            compact={compact}
            trigger={trigger}
            workspace={workspace}
          />
        )}
        wide
      />
    </ViewportScope>
  )
}
