import { useAction } from '../ui/useAction'

/**
 * The write of a question, and the dismissal of the question. While the
 * write runs, nothing closes the question, as the Archive question does:
 * Cancel is off, and Escape and a press outside do nothing, on desktop and
 * in the sheet of a phone. A dismissal cannot stop the write, and a failure
 * shows in the question. The rest of the page is inert while the question
 * shows, so no newer question opens before the write ends, and the close
 * after the write closes only its own question.
 */
export function useQuestion<A extends unknown[]>(
  write: (...args: A) => Promise<void>,
  close: () => void,
) {
  const action = useAction(async (...args: A) => {
    await write(...args)
    close()
  })
  const dismiss = () => {
    if (!action.pending) close()
  }
  return { ...action, dismiss }
}
