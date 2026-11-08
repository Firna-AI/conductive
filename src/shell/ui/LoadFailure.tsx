import { RotateCw, TriangleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { ApiError } from '../../app/api/client'
import { ActionButton } from './actions'
import { useAction } from './useAction'

/**
 * Data that did not load: what failed, the reason from the API, and Try
 * again, which loads it again. The button is busy while the load runs.
 */
export function LoadFailure(props: {
  title: string
  error: ApiError
  retry: () => Promise<void>
}) {
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
      body={props.error.message}
      icon={TriangleAlert}
      title={props.title}
      tone="danger"
    />
  )
}
