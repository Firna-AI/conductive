import { CircleAlert, RotateCw } from 'lucide-react'
import { ActionButton } from './actions'
import { Notice } from './Notice'
import { StatusText } from './StatusText'

/** A quiet line while data loads, such as "Loading the members". */
export function Loading(props: { label: string }) {
  return <StatusText busy label={props.label} tone="muted" />
}

/** Data that did not load: what failed, the reason, and Try again. */
export function LoadFailure(props: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <Notice
      action={
        <ActionButton icon={RotateCw} onPress={props.onRetry}>
          Try again
        </ActionButton>
      }
      body={props.message}
      icon={CircleAlert}
      title={props.title}
      tone="danger"
    />
  )
}
