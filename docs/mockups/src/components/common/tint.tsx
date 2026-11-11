import { useMemo, type ReactNode } from 'react'
import {
  createSharedUiTheme,
  SharedUiThemeProvider,
  useSharedUiTheme,
} from '@firna/ui/theme'
import { darkPalette, lightPalette } from '../../design/palette'

/** The tint of a filled button: the tone of the bar state that it acts on. */
export type ButtonTint = 'success' | 'warning' | 'danger'

/** The palette keys of the fill of each tint, at rest and on hover. */
const fills = {
  success: ['successFill', 'successFillHover'],
  warning: ['warningFill', 'warningFillHover'],
  danger: ['dangerFill', 'dangerFillHover'],
} as const

/**
 * Draws the primary buttons inside it in a tint. It gives the primary tone
 * of Firna the fill of the tint, a deeper fill on hover, and the white
 * `onFill` label, so each button keeps the hover, press, focus, and busy
 * states of that tone. Without a tint, the buttons keep the primary fill.
 */
export function TintedTheme(props: {
  tint: ButtonTint | null | undefined
  children: ReactNode
}) {
  const theme = useSharedUiTheme()
  const { tint } = props
  const tinted = useMemo(() => {
    if (!tint) return null
    const palette = theme.scheme === 'dark' ? darkPalette : lightPalette
    const [rest, hover] = fills[tint]
    const colors = {
      primary: palette[rest],
      primaryDeep: palette[hover],
      onSolid: palette.onFill,
    }
    return createSharedUiTheme({ colors }, theme)
  }, [theme, tint])
  if (!tinted) return props.children
  return (
    <SharedUiThemeProvider theme={tinted}>
      {props.children}
    </SharedUiThemeProvider>
  )
}
