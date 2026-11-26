import { useToast } from '@firna/ui/toast'
import { errorMessage } from '../../app/api/client'
import { useApp } from '../context'

/**
 * The move of an org to `index` among the other orgs of the person, from a
 * drag, the tile menu, or the keys. `index` counts the orgs that the
 * switchers show, from `AppModel.activeOrgs`. The save gives the place in
 * the full order of `AppModel.orgs`, which keeps the deleted orgs: just
 * before the org that follows it in the switcher, else at the end. The move
 * shows at once. When its save fails, only that move goes back, and a toast
 * names what failed, as for a workspace row.
 */
export function useOrgMove(): (orgId: string, index: number) => void {
  const app = useApp()
  const { toast } = useToast()
  return (orgId, index) => {
    const others = app.orgs.get().filter((org) => org.id !== orgId)
    const shown = app.activeOrgs.get().filter((org) => org.id !== orgId)
    const before = shown[index]
    const place = before
      ? others.findIndex((org) => org.id === before.id)
      : others.length
    void app.moveOrg(orgId, place).catch((error: unknown) =>
      toast({
        title: "The org didn't move.",
        description: errorMessage(error),
        tone: 'error',
      }),
    )
  }
}
