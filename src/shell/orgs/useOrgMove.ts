import { useToast } from '@firna/ui/toast'
import { errorMessage } from '../../app/api/client'
import { useApp } from '../context'

/**
 * The move of an org to `index` among the other orgs of the person, from a
 * drag, the tile menu, or the keys. The move shows at once. When its save
 * fails, only that move goes back, and a toast names what failed, as for a
 * workspace row.
 */
export function useOrgMove(): (orgId: string, index: number) => void {
  const app = useApp()
  const { toast } = useToast()
  return (orgId, index) =>
    void app.moveOrg(orgId, index).catch((error: unknown) =>
      toast({
        title: "The org didn't move.",
        description: errorMessage(error),
        tone: 'error',
      }),
    )
}
