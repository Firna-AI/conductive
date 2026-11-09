import type { KeyboardEvent } from 'react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'

/**
 * The send key of every composer: the chat of a workspace, and the page and
 * the dialog of New workspace. On a computer, Enter sends and Shift+Enter
 * adds a line. While the message cannot go, Enter does nothing. While an
 * input method composes a word, Enter belongs to the input method. In the
 * phone layout, which has the touch sizes, Enter adds a line.
 *
 * A composer gives the result to `onKeyDownCapture` of the box around its
 * text field. It reads Enter before the text field does, so Enter never
 * adds a line to a message that it sends.
 */
export function useSendKey(
  ready: boolean,
  send: () => void,
): (event: KeyboardEvent<HTMLElement>) => void {
  const touch = useControlSizes().field === 'lg'
  return (event) => {
    if (touch || event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing) return
    if (!(event.target instanceof HTMLTextAreaElement)) return
    event.preventDefault()
    if (ready) send()
  }
}
