import type { CSSProperties } from 'react'
import { fonts, radii } from '../design/metrics'
import { darkPalette as dark, lightPalette as light } from '../design/palette'

/**
 * The media query of the dark colours. Only some email clients read it, so
 * the email is light by default.
 */
export const darkSchemeQuery = '(prefers-color-scheme: dark)'

const { md: tileRadius = 4, lg: buttonRadius = 6, xl: cardRadius = 8 } = radii

/**
 * The rules that change the colours: the dark palette, and less padding on
 * a narrow screen. Inline styles carry the light colours, so each rule here
 * needs `!important`.
 */
export const schemeCss = `
@media ${darkSchemeQuery} {
  .cd-page { background-color: ${dark.bg} !important; }
  .cd-card { background-color: ${dark.surface} !important; border-color: ${dark.border} !important; }
  .cd-ink { color: ${dark.ink} !important; }
  .cd-text { color: ${dark.ink2} !important; }
  .cd-muted { color: ${dark.muted} !important; }
  .cd-link { color: ${dark.link} !important; }
  .cd-button { background-color: ${dark.primary} !important; color: ${dark.onSolid} !important; }
  .cd-rule { border-top-color: ${dark.border} !important; }
  .cd-tile { background-color: ${dark.soft} !important; border-color: ${dark.border2} !important; color: ${dark.ink2} !important; }
}
@media (max-width: 520px) {
  .cd-content { padding: 24px 20px !important; }
}`

/** Each text sets its font, because Outlook does not pass it down. */
const font: CSSProperties = { fontFamily: fonts.sans }

/** The inline styles of the layout, in the light palette. */
export const styles = {
  root: { backgroundColor: light.bg },
  body: { ...font, margin: 0, padding: 0 },
  page: { padding: '32px 12px', backgroundColor: light.bg },
  card: {
    maxWidth: 480,
    border: `1px solid ${light.border}`,
    borderRadius: cardRadius,
    backgroundColor: light.surface,
  },
  content: { padding: '28px 32px' },
  brand: {
    ...font,
    margin: 0,
    color: light.ink,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: '24px',
  },
  heading: {
    ...font,
    margin: 0,
    color: light.ink,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: '28px',
  },
  paragraph: {
    ...font,
    margin: '0 0 12px',
    color: light.ink2,
    fontSize: 14,
    lineHeight: '22px',
  },
  button: {
    ...font,
    padding: '10px 18px',
    borderRadius: buttonRadius,
    backgroundColor: light.primary,
    color: light.onSolid,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    textDecoration: 'none',
  },
  small: {
    ...font,
    margin: '12px 0 0',
    color: light.muted,
    fontSize: 13,
    lineHeight: '20px',
  },
  link: { color: light.link, wordBreak: 'break-all' },
  rule: { margin: '24px 0 16px', borderTop: `1px solid ${light.border}` },
  footer: {
    ...font,
    margin: '0 0 4px',
    color: light.muted,
    fontSize: 12,
    lineHeight: '18px',
  },
  tile: {
    ...font,
    width: 34,
    height: 34,
    border: `1px solid ${light.border2}`,
    borderRadius: tileRadius,
    backgroundColor: light.soft,
    color: light.ink2,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    verticalAlign: 'middle',
  },
} satisfies Record<string, CSSProperties>
