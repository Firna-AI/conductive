import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { deleteAutomation } from '../../app/automation-actions'
import { routes } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

/**
 * Delete of an automation, which asks first, because a deleted automation cannot
 * come back. Its run workspaces stay, as normal workspaces do. After the
 * delete, the Automations list opens in place of the page of the automation. A
 * new automation has nothing to delete yet.
 */
export function useDeleteAutomation(
  org: OrgSummary,
  automation: Automation | null,
): { ask: () => void; question: ReactNode } {
  const orgModel = useOrgModel(org.id)
  const navigation = useNavigation()
  const [asked, setAsked] = useState(false)
  const remove = useAction(async () => {
    if (!automation) return
    await deleteAutomation(orgModel, automation.id)
    navigation.replace(routes.automations(org.id))
  }, 'The automation was not deleted')
  const close = () => setAsked(false)
  const question =
    asked && automation ? (
      <Dialog
        action={
          <ActionButton
            busy={remove.pending}
            icon={Trash2}
            onPress={() => remove.run()}
            tone="danger"
          >
            Delete automation
          </ActionButton>
        }
        busy={remove.pending}
        close={close}
        title={`Delete ${automation.name}?`}
      >
        <DialogText>
          Its triggers and prompt are deleted. Its run workspaces stay.
        </DialogText>
      </Dialog>
    ) : null
  return { ask: () => setAsked(true), question }
}
