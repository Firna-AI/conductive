import type { Workspace } from '../shared/generated/Workspace'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { OrgMember } from '../shared/members'

import { errorMessage, type MembersApi } from './api/client'
import { personName } from './people'
import styles from './ui/ChoiceMenu.module.css'
import { MenuPanel, type MenuChoice } from './ui/MenuPanel'
import { PersonAvatar } from './ui/PersonAvatar'

/**
 * A new owner moves no session to another login: each session keeps the
 * login that it took at its first message, the personal login of a member
 * or the org login.
 */
const loginNote = 'Each session keeps its agent login.'

type Members =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; members: readonly OrgMember[] }

/** The line in place of the members while they load or after a failure. */
function statusText(members: Members): string | undefined {
  if (members.status === 'loading') return 'Loading the members'
  if (members.status === 'failed') return 'The members did not load.'
  return undefined
}

/** The members of the org as choices of a new owner, and their states. */
export interface OwnerChoicesState {
  /** The choices open: an old error goes, and the members load again. */
  open: () => void
  /** A change of the owner runs, so the menu of the choices stays open. */
  busy: boolean
  /** The props of the panel of the choices. */
  panel: {
    label: string
    group: string
    choices: readonly MenuChoice<string>[]
    selected: string
    busy: string | null
    status?: string
    error?: string
    note: string
    onSelect: (userId: string) => void
  }
}

/**
 * The members whom an admin can make the owner of a workspace, as the owner
 * picker of the header and the menu of a workspace row show them. A list
 * that loaded before stays while it loads again. Only the newest load of a
 * mounted owner changes the list. A choice of the owner closes the menu. A
 * choice of another member sends the change, and the menu stays open until
 * the reply: the answer goes to `onReassigned` and the menu closes, or the
 * error shows in the menu. A new owner changes no login and does not
 * restart the cloud computer.
 *
 * The state keeps to `scope`, as a key keeps the state of a component. A
 * new scope drops the members, the change that runs, and its error. The
 * answers of the requests of an older scope then change nothing and call
 * no callback, also when that scope comes back.
 */
export function useOwnerChoices(props: {
  api: MembersApi
  workspace: Workspace
  /** The owner changed. The workspace is the API's answer. */
  onReassigned: (workspace: Workspace) => void
  /** Closes the menu of the choices. */
  close: () => void
  /** The scope of the state, such as the access that offers the choices. */
  scope?: string
}): OwnerChoicesState {
  const { api, workspace } = props
  const loads = useRef(0)
  const [members, setMembers] = useState<Members>({ status: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Each scope gets a new object, so a scope that comes back is a new one.
  const [scope, setScope] = useState(() => ({ key: props.scope }))
  if (scope.key !== props.scope) {
    setScope({ key: props.scope })
    setMembers({ status: 'loading' })
    setBusy(null)
    setError(null)
  }
  // The scope that shows, or null after the owner unmounts.
  const shown = useRef<object | null>(null)
  useLayoutEffect(() => {
    shown.current = scope
    return () => {
      shown.current = null
    }
  }, [scope])
  /** Notes the scope as a request starts. The check says that it still shows. */
  const startScope = useCallback(() => {
    const start = shown.current
    return () => start !== null && shown.current === start
  }, [])

  const open = useCallback(() => {
    setError(null)
    setMembers((current) =>
      current.status === 'failed' ? { status: 'loading' } : current,
    )
    const load = ++loads.current
    const live = startScope()
    const newest = () => live() && load === loads.current
    api.members(workspace.orgId).then(
      (response) => {
        if (newest()) setMembers({ status: 'ready', members: response.members })
      },
      (reason: unknown) => {
        if (newest())
          setMembers({ status: 'failed', message: errorMessage(reason) })
      },
    )
  }, [api, workspace.orgId, startScope])

  async function select(userId: string) {
    if (userId === workspace.owner.id) {
      props.close()
      return
    }
    const live = startScope()
    setBusy(userId)
    setError(null)
    try {
      const updated = await api.reassignWorkspace(
        workspace.orgId,
        workspace.id,
        { userId },
      )
      if (!live()) return
      props.close()
      props.onReassigned(updated)
    } catch (reason) {
      if (live()) setError(`The owner did not change. ${errorMessage(reason)}`)
    } finally {
      if (live()) setBusy(null)
    }
  }

  const list = members.status === 'ready' ? members.members : []
  return {
    open,
    busy: busy !== null,
    panel: {
      label: 'Owner',
      group: 'Owner',
      choices: list.map((member) => ({
        value: member.user.id,
        label: personName(member.user),
        mark: <PersonAvatar person={member.user} size={18} />,
      })),
      selected: workspace.owner.id,
      busy,
      status: statusText(members),
      error:
        members.status === 'failed' ? members.message : (error ?? undefined),
      note: loginNote,
      onSelect: (userId) => void select(userId),
    },
  }
}

/**
 * The owner choices in a menu of the app shell, such as the menu of a
 * workspace row: beside the menu on desktop, whose box holds them, or in a
 * phone sheet. The menu that holds them moves the focus into them, so a
 * hover that shows them leaves the focus where it is.
 */
export function OwnerChoices(props: {
  choices: OwnerChoicesState
  layout: 'menu' | 'sheet'
}) {
  return (
    <div className={props.layout === 'sheet' ? styles.sheet : styles.panel}>
      <MenuPanel {...props.choices.panel} autoFocus={false} />
    </div>
  )
}
