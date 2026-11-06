/// <reference types="vite/client" />
import { siteFiles } from './assets'
import { picturesCss } from './frames'
import baseCss from './styles/base.css?inline'
import chromeCss from './styles/chrome.css?inline'
import framesCss from './styles/frames.css?inline'
import heroCss from './styles/hero.css?inline'
import legalCss from './styles/legal.css?inline'
import sectionsCss from './styles/sections.css?inline'
import { tokensCss } from './tokens'

function fontFace(): string {
  return `@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url('${siteFiles.font}') format('woff2')}`
}

let stylesheet: string | undefined

/**
 * The one stylesheet of the site: the font, the tokens of the design, the
 * parts of the pages, and the size of each picture. Every page carries it
 * in its head, so a page needs no other request before it shows.
 */
export function siteStylesheet(): string {
  stylesheet ??= [
    fontFace(),
    tokensCss(),
    baseCss,
    chromeCss,
    heroCss,
    framesCss,
    sectionsCss,
    legalCss,
    picturesCss(),
  ].join('\n')
  return stylesheet
}

let styleHash: Promise<string> | undefined

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

/**
 * The content security policy of the pages. The pages run no script, load
 * files only from the site, and allow only the one stylesheet.
 */
export async function contentSecurityPolicy(): Promise<string> {
  styleHash ??= sha256Base64(siteStylesheet())
  return [
    "default-src 'none'",
    `style-src 'sha256-${await styleHash}'`,
    "img-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}
