import type { useToast } from '@firna/ui/toast'
import type { ServiceControlAction } from '../../../../shared/generated/ServiceControlAction'
import {
  serviceControlCopy,
  servicesCopy,
} from '../../../../ui/components/tools/serviceCopy'
import type { ServiceAnswer } from '../../../../previews/services/serviceAnswer'

type Toast = ReturnType<typeof useToast>['toast']

/**
 * Shows the answer of a Stop or a Restart of one service with the toasts of
 * the app: the failure toast with the message of the server, a warning for
 * a reply that did not arrive, and an information for a run that ended
 * first. A failed Restart says Restart. A control that worked shows only
 * the list.
 */
export function showServiceAnswer(
  toast: Toast,
  action: ServiceControlAction,
  name: string,
  answer: ServiceAnswer,
): void {
  const word = action === 'stop' ? servicesCopy.stop : servicesCopy.restart
  switch (answer.kind) {
    case 'done':
      return
    case 'failed':
      toast({
        title:
          action === 'stop'
            ? serviceControlCopy.stopFailed(name)
            : serviceControlCopy.restartFailed(name),
        description: answer.message,
        tone: 'error',
      })
      return
    case 'unconfirmed':
      toast({
        title: serviceControlCopy.unconfirmed(word, name),
        description: servicesCopy.latestState,
        tone: 'warning',
      })
      return
    case 'stale':
      toast({
        title: serviceControlCopy.stale(word),
        description: serviceControlCopy.staleBody(name),
        tone: 'info',
      })
  }
}
