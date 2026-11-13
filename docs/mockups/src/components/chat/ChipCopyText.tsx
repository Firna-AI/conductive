import styles from './ChipCopyText.module.css'

/**
 * The class of the root of the page while a copy of chat text runs. The
 * chips then show the text that a copy gives in place of their look, so the
 * browser's own copy gives that text, in plain text and in HTML.
 */
export const COPYING_CLASS = 'chat-copying'

/** The class of the text that a copy of a chip gives. */
export const COPY_TEXT_CLASS = styles.copyText

/**
 * The text that a copy of a chip gives, such as its mention `@src/app.ts`.
 * It shows only while a copy runs, as `COPYING_CLASS` says, and a screen
 * reader never reads it.
 */
export function ChipCopyText(props: { text?: string }) {
  if (props.text === undefined) return null
  return (
    <span aria-hidden className={styles.copyText}>
      {props.text}
    </span>
  )
}
