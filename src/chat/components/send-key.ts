import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'

/**
 * The send key of every composer: the chat of a workspace, and the page and
 * the dialog of New workspace. On a computer, Enter sends and Shift+Enter
 * adds a line. While the message cannot go, Enter does nothing. While an
 * input method composes a word, Enter belongs to the input method. In the
 * phone layout, which has the touch sizes, Enter adds a line.
 *
 * A composer gives the result to `onEnter` of its chip text field, which
 * calls it before it adds a line. The result says whether the send key took
 * Enter, so that Enter never adds a line to a message that it sends.
 */
export function useSendKey(
  ready: boolean,
  send: () => void,
): (event: KeyboardEvent) => boolean {
  const touch = useControlSizes().field === 'lg'
  return (event) => {
    if (touch || event.key !== 'Enter' || event.shiftKey) return false
    if (event.isComposing) return false
    event.preventDefault()
    if (ready) send()
    return true
  }
}
