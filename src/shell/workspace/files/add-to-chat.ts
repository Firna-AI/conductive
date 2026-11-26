import { useCallback, useSyncExternalStore } from 'react'
import { addToChatItem } from '../../../ui/components/files/rowMenuCopy'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import {
  findMentioned,
  useFilesMentionTree,
} from '../../../chat/mentions/MentionsContext'
import type { FileRowTarget } from '../../../files/panel/row-menu'
import { useApp } from '../../context'
import type { MenuAction } from '../../ui/Menu'
import type { WorkspaceContext } from '../features'
import { barReplacesComposer } from '../sandbox-view'
import { useKeptFiles } from './workspace-files'

/**
 * Add to chat of the row menu, the first group of the menu of a row of All
 * files or Changes, as
 * [Add to chat](../../../../docs/protocol/file-mentions.md#add-to-chat)
 * says. The item gives the kept chat the file or the folder of its row, and
 * the chat puts its chip into the message field of the session that the
 * member saw last, or of a new session, as `ChatController.addToChat` says.
 *
 * On desktop, the chat leaves a file tab for that session, and the field
 * takes the focus through the focus request of the app. The row menu gives
 * the focus back to the row before its item runs, so the request names the
 * row, and a focus that moves on from the row before the field shows keeps
 * its place. A phone switches to the chat, and its field takes no focus, so
 * no keyboard opens by itself.
 *
 * The item shows only on a row whose entry the list of `@` offers, so a
 * deleted file of Changes has none. It shows only while a message field can
 * take the chip: after the chat loads, and never while a bar of the sandbox
 * takes the place of the composer. A read-only workspace shows no row.
 */
export function useAddToChat(
  context: WorkspaceContext,
): (row: FileRowTarget) => MenuAction[] {
  const app = useApp()
  const navigation = useNavigation()
  const tree = useFilesMentionTree(useKeptFiles(context))
  const { chat, org, workspace } = context
  const readLoaded = () => chat.getSnapshot().load.state === 'ready'
  const loaded = useSyncExternalStore(chat.subscribe, readLoaded, readLoaded)
  const phone = context.viewport === 'phone'
  const offered = loaded && !context.readOnly && !barReplacesComposer(context)
  const add = useCallback(
    (row: FileRowTarget) => {
      if (!phone) {
        const from = document.activeElement
        app.composerFocus.set({ workspaceId: workspace.id, from })
      }
      void chat.addToChat({ path: row.path, folder: row.kind === 'directory' })
      if (phone) navigation.push(routes.workspace(org.id, workspace.id))
    },
    [app, chat, navigation, org.id, workspace.id, phone],
  )
  return useCallback(
    (row: FileRowTarget): MenuAction[] => {
      if (!offered || tree === null || row.change === 'deleted') return []
      const folder = row.kind === 'directory'
      if (!findMentioned(tree, row.path, folder)) return []
      const { label, icon } = addToChatItem
      return [{ kind: 'item', label, icon, onSelect: () => add(row) }]
    },
    [offered, tree, add],
  )
}
