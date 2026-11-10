import { useToast } from '@firna/ui/toast'
import type { ApiErrorDetails } from '../../app/api/client'
import { useNavigation } from '../../app/navigation'
import { createRoutine, updateRoutine } from '../../app/routine-actions'
import {
  createRequest,
  updateRequest,
  type RoutineDraft,
} from '../../app/routine-draft'
import { routes } from '../../app/router'
import { asApiError } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import { useOrgModel } from '../context'
import { useAction, type Action } from '../ui/useAction'
import type { SavedDraft } from '../ui/useSavedDraft'

/** The refusal of a save whose author filter names no GitHub account. */
const unknownLogin = 'unknown_github_login'

/** A login that a save refused, with its trigger and its list. */
export type RefusedLogin = ApiErrorDetails

/**
 * Save of the routine page. The first save creates the routine and opens
 * its page in place of the new page. A later save sends the fields that
 * changed. When the API refuses an unknown login and names it, the form
 * marks its chip. A refusal that names no login shows its words under the
 * triggers, and any other failed save shows a toast.
 */
export function useRoutineSave(args: {
  org: OrgSummary
  routine: Routine | null
  form: SavedDraft<RoutineDraft>
  saved: RoutineDraft
}): {
  save: Action<[]>
  refused: RefusedLogin | null
  refusal: string | null
} {
  const { org, routine, form, saved } = args
  const orgModel = useOrgModel(org.id)
  const navigation = useNavigation()
  const { toast } = useToast()
  const save = useAction(async () => {
    try {
      if (!routine) {
        const created = await createRoutine(orgModel, createRequest(form.draft))
        navigation.replace(routes.routine(org.id, created.id))
        return
      }
      await form.save(async (value) => {
        await updateRoutine(orgModel, routine.id, updateRequest(saved, value))
      })
    } catch (error) {
      const problem = asApiError(error)
      if (problem.code !== unknownLogin) {
        toast({
          title: 'The routine was not saved',
          description: problem.message,
          tone: 'error',
        })
      }
      throw error
    }
  })
  const error = save.error?.code === unknownLogin ? save.error : null
  return {
    save,
    refused: error?.details ?? null,
    refusal: error && !error.details ? error.message : null,
  }
}
