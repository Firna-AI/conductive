import { byRole } from '../test-support/dom-queries'
import { press, requestDialogClose } from '../test-support/mount'

/** One way that a person asks an open dialog to close. */
export type CloseRequest = { how: string; send: () => Promise<void> }

/**
 * A test helper: each way that a person asks a dialog or a sheet to close.
 * A question also has its Cancel button.
 */
export function closeRequests(
  dialog: HTMLDialogElement,
  options: { cancelButton: boolean },
): CloseRequest[] {
  const requests: CloseRequest[] = [
    { how: 'Escape', send: () => requestDialogClose(dialog) },
    { how: 'a press on the dimmed page', send: () => press(dialog) },
    {
      how: 'a close by the browser',
      send: () => requestDialogClose(dialog, { cancelable: false }),
    },
  ]
  if (!options.cancelButton) return requests
  const cancel = () => press(byRole('button', 'Cancel', dialog))
  return [{ how: 'Cancel', send: cancel }, ...requests]
}
