import { SearchX } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { routes } from '../../app/router'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'

/**
 * A workspace that the app cannot show, such as after a 404. The way out is
 * the list of the org.
 */
export function Unavailable(props: { orgId: string; body: string }) {
  const go = useGo()
  return (
    <EmptyState
      action={
        <ActionButton
          onPress={() => go(routes.org(props.orgId))}
          tone="primary"
        >
          All workspaces
        </ActionButton>
      }
      body={props.body}
      icon={SearchX}
      title="This workspace is not available"
    />
  )
}
