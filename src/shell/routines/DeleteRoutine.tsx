import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { deleteRoutine } from '../../app/routine-actions'
import { routes } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

/**
 * Delete of a routine, which asks first, because a deleted routine cannot
 * come back. Its run workspaces stay, as normal workspaces do. After the
 * delete, the Routines list opens in place of the page of the routine. A
 * new routine has nothing to delete yet.
 */
export function useDeleteRoutine(
  org: OrgSummary,
  routine: Routine | null,
): { ask: () => void; question: ReactNode } {
  const orgModel = useOrgModel(org.id)
  const navigation = useNavigation()
  const [asked, setAsked] = useState(false)
  const remove = useAction(async () => {
    if (!routine) return
    await deleteRoutine(orgModel, routine.id)
    navigation.replace(routes.routines(org.id))
  }, 'The routine was not deleted')
  const close = () => setAsked(false)
  const question =
    asked && routine ? (
      <Dialog
        actions={
          <>
            <ActionButton onPress={close}>Cancel</ActionButton>
            <ActionButton
              busy={remove.pending}
              icon={Trash2}
              onPress={() => remove.run()}
              tone="danger"
            >
              Delete routine
            </ActionButton>
          </>
        }
        close={close}
        title={`Delete ${routine.name}?`}
      >
        <DialogText>
          Its triggers and prompt are deleted. Its run workspaces stay.
        </DialogText>
      </Dialog>
    ) : null
  return { ask: () => setAsked(true), question }
}
