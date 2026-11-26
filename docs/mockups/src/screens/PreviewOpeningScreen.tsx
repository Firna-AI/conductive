import type { SchemaProps } from '@mokly/mokly'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { logoTile } from '../entries/components/brand/Logo.mockup'
import { previewOpeningCopy } from '../../../../src/ui/components/tools/previewCopy'
import styles from '../../../../src/ui/screens/PreviewOpeningScreen.module.css'

export const previewOpeningSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['state'],
  properties: {
    /** The page waits for the preview, or the preview cannot open. */
    state: { enum: ['opening', 'failed'] },
  },
} as const

export type PreviewOpeningState = SchemaProps<typeof previewOpeningSchema>

/**
 * The page that shows while a preview opens, in the frame of the Preview
 * tool or in a browser tab. The server sends it as one small file, so it
 * draws the same tile, ring, and words with inline styles.
 */
export function PreviewOpeningScreen(props: { state: PreviewOpeningState }) {
  const theme = useSharedUiTheme()
  const failed = props.state.state === 'failed'
  return (
    <main className={styles.page}>
      <logoTile.Component moklyInstance="logo" size={40} />
      <div className={styles.status} role="status">
        {failed ? (
          <>
            <p className={styles.title}>{previewOpeningCopy.failedTitle}</p>
            <p className={styles.body}>{previewOpeningCopy.failedBody}</p>
          </>
        ) : (
          <div className={styles.line}>
            <Spinner
              accessibilityLabel={previewOpeningCopy.opening}
              color={theme.colors.muted}
              size={16}
            />
            <span aria-hidden>{previewOpeningCopy.opening}</span>
          </div>
        )}
      </div>
    </main>
  )
}
