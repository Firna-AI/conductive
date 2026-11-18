import { useEffect, useRef } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { WorkspaceContext } from '../features'
import { filesPlace, tabOf } from './files-address'

/**
 * After a repository change, the file or diff page of the address belongs
 * to the folder of the old repository, and the chat closed its tab. The
 * address then goes to the chat on desktop, and to the Files tab on a
 * phone, in place of the page. It draws nothing.
 */
export function LeaveMovedFiles(props: { context: WorkspaceContext }) {
  const { org, workspace, view, viewport } = props.context
  const navigation = useNavigation()
  const repositoryId = workspace.repositoryId
  const before = useRef(repositoryId)
  const showsTab = tabOf(filesPlace(view)) !== null
  const phone = viewport === 'phone'
  useEffect(() => {
    const previous = before.current
    before.current = repositoryId
    if (previous === repositoryId || !showsTab) return
    navigation.replace(
      phone
        ? routes.workspace(org.id, workspace.id, 'files')
        : routes.workspace(org.id, workspace.id),
    )
  }, [navigation, org.id, workspace.id, repositoryId, showsTab, phone])
  return null
}
