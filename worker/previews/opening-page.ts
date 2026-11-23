import { previewOpeningCopy } from '../../src/ui/components/tools/previewCopy'
import { darkPalette, lightPalette } from '../../src/ui/design/palette'

/*
 * The page that shows while a preview opens, as `app/tools/preview-opening`
 * of the mockups draws it. It is one small file: inline styles and inline
 * drawings, with no font, image, or script file. So it needs only a style
 * nonce in its CSP, and it shows at once.
 */

/** The favicon drawing of `docs/brand/web/favicon.svg`, as the logo tile. */
const tile = `<svg class="tile" viewBox="0 0 32 32" width="40" height="40" aria-hidden="true"><defs><linearGradient id="tile" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2c2f35"/><stop offset="1" stop-color="#0f1114"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#tile)"/><g fill="#eef0f3"><rect x="12" y="4" width="12" height="2" rx="1"/><rect x="8" y="8" width="14" height="2" rx="1"/><rect x="6" y="12" width="6" height="2" rx="1"/><rect x="6" y="16" width="8" height="2" rx="1"/><rect x="8" y="20" width="12" height="2" rx="1"/><rect x="12" y="24" width="12" height="2" rx="1"/></g></svg>`

/*
 * The ring of the Firna `Spinner` at 16 px: a track and a quarter arc with
 * round ends, 2 px thick. The circumference of the radius of 7 is 43.98.
 */
const ring = `<svg class="ring" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke-width="2" class="track"/><circle cx="8" cy="8" r="7" fill="none" stroke-width="2" stroke-linecap="round" stroke-dasharray="11 32.98" class="arc"/></svg>`

function scheme(palette: typeof darkPalette): string {
  return `--surface:${palette.surface};--ink:${palette.ink};--muted:${palette.muted};--track:${palette.border2}`
}

/* The app is dark first. A system set to light gets the light scheme. */
const styles = `
:root{color-scheme:dark;${scheme(darkPalette)}}
@media (prefers-color-scheme:light){:root{color-scheme:light;${scheme(lightPalette)}}}
html{background:var(--surface)}
html,body{height:100%;margin:0}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;box-sizing:border-box;font:13px/1.4 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;-webkit-font-smoothing:antialiased;animation:appear .2s ease-out .15s both}
p{margin:0}
form{display:none}
.status{display:flex;flex-direction:column;align-items:center;gap:4px}
.line{display:flex;align-items:center;gap:8px;color:var(--muted)}
.track{stroke:var(--track)}
.arc{stroke:var(--muted)}
.ring{animation:turn .8s linear infinite}
.detail{max-width:300px;color:var(--muted);font-size:12px;line-height:1.5}
.detail:empty{display:none}
.failed .ring{display:none}
.failed .line{color:var(--ink);font-weight:600}
@keyframes appear{from{opacity:0}}
@keyframes turn{to{transform:rotate(1turn)}}
@keyframes fade{50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){.ring{animation:fade 2.4s linear infinite}}
`

/**
 * The full page: the tile and the status of the open. `failPreview` in the
 * page script shows the failure in the same status. `extra` holds markup
 * that the page needs beside the status, such as a form.
 */
export function previewOpeningPage(input: {
  nonce: string
  script: string
  extra?: string
}): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${previewOpeningCopy.opening}</title><style nonce="${input.nonce}">${styles}</style></head><body>${tile}<div class="status" id="status" role="status"><p class="line">${ring}<span id="title">${previewOpeningCopy.opening}</span></p><p class="detail" id="detail"></p></div>${input.extra ?? ''}<script nonce="${input.nonce}">${input.script}</script></body></html>`
}

/** Page script that swaps the status for the failure. */
export const failPreviewScript = `
const failPreview = () => {
  document.body.classList.add('failed')
  document.title = ${JSON.stringify(previewOpeningCopy.failedTitle)}
  document.getElementById('title').textContent = ${JSON.stringify(previewOpeningCopy.failedTitle)}
  document.getElementById('detail').textContent = ${JSON.stringify(previewOpeningCopy.failedBody)}
}`

/** The CSP source of the page style. */
export function previewOpeningStyleSource(nonce: string): string {
  return `style-src 'nonce-${nonce}'`
}
