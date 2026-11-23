import { RotateCw, TriangleAlert } from 'lucide-react'
import { Notice } from '../../ui/components/common/Notice'
import type { ApiError } from '../../app/api/client'
import { ActionButton } from './actions'
import { useAction } from './useAction'

/**
 * Data that did not load: what failed, the reason, and Try again, which
 * loads it again. The reason is the message of the API's error, or `body`
 * when the server answered but a service behind it did not, such as
 * GitHub. The button is busy while the load runs.
 */
export function LoadFailure(
  props: {
    title: string
    retry: () => Promise<void>
  } & ({ error: Pick<ApiError, 'message'> } | { body: string }),
) {
  const retry = useAction(props.retry)
  return (
    <Notice
      action={
        <ActionButton
          busy={retry.pending}
          icon={RotateCw}
          onPress={() => retry.run()}
        >
          Try again
        </ActionButton>
      }
      body={'error' in props ? props.error.message : props.body}
      icon={TriangleAlert}
      title={props.title}
      tone="danger"
    />
  )
}
