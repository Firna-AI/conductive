import type { LucideIcon } from 'lucide-react'
import { Link } from 'lucide-react'

/**
 * The words of a copy of a link: the Copy link item of the menu of a
 * workspace row and of a session tab, and the result of a copy. The note
 * under the Copy link button of the header and the toast after a menu item
 * give the same words.
 */

/** The item of a menu that copies the link of its workspace or session. */
export const linkItem: { label: string; icon: LucideIcon } = {
  label: 'Copy link',
  icon: Link,
}

/** The result of a copy of a link: it worked, or the clipboard refused it. */
export const linkResults = {
  copied: 'Link copied',
  failed: "The link didn't copy. Try again.",
} as const
