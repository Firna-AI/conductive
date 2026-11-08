import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { useApp } from '../context'
import { useAction } from '../ui/useAction'

/** The status of a done step, such as Installed or Tested. */
export function DoneStatus(props: { label: string }) {
  return <StatusText label={props.label} tone="success" />
}

/**
 * Loads the steps again after a step is done, so that the next step opens.
 * A failed load shows a toast, and the steps stay as they were.
 */
export function useRefreshSteps() {
  const app = useApp()
  return useAction(() => app.refreshGetStarted(), "The steps didn't update.")
}
