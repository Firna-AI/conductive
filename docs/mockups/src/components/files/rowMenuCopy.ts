import type { LucideIcon } from 'lucide-react'
import { AtSign, Copy } from 'lucide-react'

/**
 * The words of the menu of a row of All files or Changes, and of the Copy
 * path item of the menu of a file or diff tab, from the file row menu
 * change. The toast after Copy path gives the result, because the menu
 * closes on the press.
 */

/**
 * The item that puts the chip of the file or the folder of the row in the
 * message field of the session tab that the member saw last. Its icon is
 * the `@` of a mention, because the chip is the mention that a pick from
 * the list of `@` gives. The speech bubble with a plus names New session.
 */
export const addToChatItem: { label: string; icon: LucideIcon } = {
  label: 'Add to chat',
  icon: AtSign,
}

/**
 * The item that copies the path of the file or the folder from the root of
 * the repository, such as `src/app/checkout/AddressForm.tsx`.
 */
export const copyPathItem: { label: string; icon: LucideIcon } = {
  label: 'Copy path',
  icon: Copy,
}

/** The result of Copy path: it worked, or the clipboard refused it. */
export const pathResults = {
  copied: 'Path copied',
  failed: "The path didn't copy. Try again.",
} as const
