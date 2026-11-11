import type { SharedUiColors } from '@firna/ui/theme'

/** Colours that the local layout reads, beside the Firna colours. */
type AppColors = {
  /** The workspace list column. */
  sidebar: string
  /** The icon rail beside the workspace list. */
  rail: string
  /** Header bars and tab strips. */
  bar: string
  /** The column of files, checks, and tools. */
  panel: string
  /** Chips, inline code, and quiet cards on the canvas. */
  raised: string
  /** The fill of the user's own messages. */
  bubble: string
  /**
   * The body text of the chat: answers and the user's messages. In the dark
   * scheme it is softer than `ink`, so long answers do not glare. Headings
   * and bold text keep `ink`.
   */
  chatInk: string
  composer: string
  /** A selected row or tab. */
  selected: string
  link: string
  success: string
  successSoft: string
  successBorder: string
  dangerBorder: string
  warning: string
  /** The outline of a mark on a warning fill, such as `amberSoft`. */
  warningBorder: string
  /** A merged workspace list mark, in GitHub's purple. */
  listMerged: string
  /**
   * The tint of a merged pull request: its words and icon, the fill of its
   * bar, and the outline of its number. The words keep a contrast of 4.5:1
   * or more on the fill.
   */
  merged: string
  mergedSoft: string
  mergedBorder: string
  /**
   * The fills of a button in the tint of a bar state, at rest and on hover.
   * Each one keeps the white `onFill` label at a contrast of 4.5:1 or more.
   */
  successFill: string
  successFillHover: string
  warningFill: string
  warningFillHover: string
  dangerFill: string
  dangerFillHover: string
  mergedFill: string
  mergedFillHover: string
  /** The label and the icon on a tinted fill. */
  onFill: string
  codeKeyword: string
  codeString: string
  codeComment: string
  codeNumber: string
  codeType: string
  diffAdded: string
  diffRemoved: string
  diffHunk: string
  termPrompt: string
  /** The colour of the shadow under raised surfaces. */
  shadow: string
  /** The body of the phone that the marketing site draws around a screen. */
  device: string
}

export type Palette = SharedUiColors & AppColors

/**
 * Graphite in the dark scheme, its first scheme: near-black surfaces, cool
 * greys, and one bright sky accent for what is active.
 */
export const darkPalette: Palette = {
  amber: '#f2b84b',
  amberDeep: '#f7cf7f',
  amberSoft: '#2b2211',
  bg: '#0b0c0e',
  bg2: '#20242a',
  border: '#1f2226',
  border2: '#2c3035',
  controlBorder: 'rgba(230, 234, 240, 0.16)',
  faint: '#5b626b',
  ink: '#e7e9ec',
  ink2: '#b9bec5',
  muted: '#8b929b',
  onSolid: '#04131b',
  placeholder: '#8b929b',
  primary: '#5cc8ff',
  primaryBorder: '#1d4a61',
  primaryDeep: '#9adcff',
  primarySoft: '#0f2a38',
  rose: '#ff6e6e',
  roseDeep: '#ff9a9a',
  roseSoft: '#2b1416',
  soft: '#15181b',
  surface: '#0e0f11',
  sidebar: '#0b0c0e',
  rail: '#08090a',
  bar: '#0e0f11',
  panel: '#0c0d0f',
  raised: '#16191c',
  bubble: '#1a1d21',
  // 12.7:1 on `surface`: softer than `ink` at 15.8:1, brighter than `ink2`.
  chatInk: '#cfd3d8',
  composer: '#121417',
  selected: '#1c2025',
  link: '#5cc8ff',
  success: '#4ade80',
  successSoft: '#0e2117',
  successBorder: '#1c4a2e',
  dangerBorder: '#4d1f22',
  warning: '#f2b84b',
  warningBorder: '#4d3a12',
  listMerged: '#a371f7',
  merged: '#b794f6',
  mergedSoft: '#221836',
  mergedBorder: '#3f2d6b',
  successFill: '#238636',
  successFillHover: '#1a7f37',
  warningFill: '#9e6a03',
  warningFillHover: '#845306',
  // A deep red: at the same lightness as the other fills, red looks louder.
  dangerFill: '#a8352f',
  dangerFillHover: '#8e2c27',
  mergedFill: '#8250df',
  mergedFillHover: '#7142c6',
  onFill: '#ffffff',
  codeKeyword: '#c792ea',
  codeString: '#a5e075',
  codeComment: '#6b7380',
  codeNumber: '#f78c6c',
  codeType: '#82aaff',
  diffAdded: '#0f2a1a',
  diffRemoved: '#2d1418',
  diffHunk: '#14171a',
  termPrompt: '#5cc8ff',
  shadow: 'rgba(0, 0, 0, 0.6)',
  device: '#050607',
}

/** Graphite in the light scheme: cool greys, with the accent darkened. */
export const lightPalette: Palette = {
  amber: '#9a6a06',
  amberDeep: '#7a5304',
  amberSoft: '#fbf2dc',
  bg: '#f3f5f7',
  bg2: '#dfe3e8',
  border: '#e1e5ea',
  border2: '#cdd3da',
  controlBorder: 'rgba(20, 24, 30, 0.18)',
  faint: '#9aa3ad',
  ink: '#121519',
  ink2: '#39404a',
  muted: '#58616c',
  onSolid: '#ffffff',
  placeholder: '#5f6873',
  primary: '#0a6fa8',
  primaryBorder: '#b9dcef',
  primaryDeep: '#075a89',
  primarySoft: '#e3f2fb',
  rose: '#c8323a',
  roseDeep: '#a3242b',
  roseSoft: '#fcecec',
  soft: '#eceff2',
  surface: '#ffffff',
  sidebar: '#f3f5f7',
  rail: '#e9ecf0',
  bar: '#fbfcfd',
  panel: '#ffffff',
  raised: '#f0f3f6',
  bubble: '#edf0f4',
  chatInk: '#121519',
  composer: '#ffffff',
  selected: '#e3e8ee',
  link: '#0a6fa8',
  success: '#1d7f45',
  successSoft: '#ecf7f0',
  successBorder: '#c6e7d2',
  dangerBorder: '#f2c9cb',
  warning: '#b7860b',
  warningBorder: '#ecd49a',
  listMerged: '#8250df',
  merged: '#7345d1',
  mergedSoft: '#f3eefc',
  mergedBorder: '#dacdf5',
  successFill: '#1d7f45',
  successFillHover: '#176a39',
  warningFill: '#9a6a06',
  warningFillHover: '#7a5304',
  dangerFill: '#c8323a',
  dangerFillHover: '#a3242b',
  mergedFill: '#7345d1',
  mergedFillHover: '#6337b8',
  onFill: '#ffffff',
  codeKeyword: '#7c3aed',
  codeString: '#15803d',
  codeComment: '#6b7280',
  codeNumber: '#c2410c',
  codeType: '#1d4ed8',
  diffAdded: '#e6f6eb',
  diffRemoved: '#fdeaea',
  diffHunk: '#f0f3f6',
  termPrompt: '#0a6fa8',
  shadow: 'rgba(15, 20, 30, 0.1)',
  device: '#16191d',
}
