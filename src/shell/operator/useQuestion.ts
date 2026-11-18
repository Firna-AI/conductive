import { useAction } from '../ui/useAction'

/**
 * The write of a question. After a write that worked, the question closes.
 * A failure shows in the question, which stays open. The question gives
 * `pending` to `busy` of its `Dialog`, so nothing closes it while the write
 * runs. The rest of the page is inert while the question shows, so no
 * newer question opens before the write ends, and the close after the
 * write closes only its own question.
 */
export function useQuestion<A extends unknown[]>(
  write: (...args: A) => Promise<void>,
  close: () => void,
) {
  return useAction(async (...args: A) => {
    await write(...args)
    close()
  })
}
