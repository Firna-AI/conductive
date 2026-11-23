import styles from './InlineText.module.css'

/**
 * Text with each part in backticks as inline code, as the shared
 * `InlineText` draws it.
 */
export function InlineText(props: { text: string }) {
  const parts = props.text.split('`')
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code className={styles.code} key={index}>
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
