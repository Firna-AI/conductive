import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OpenInNewTab, PreviewFrame } from './PreviewFrame'

const preview = {
  id: 'preview-1',
  port: 3000,
  url: 'https://a4826b97d1c04f15802c7e9bb2546d30.conducting-previews.test/',
  expiresAt: 1_800_086_400_000,
}

/** The attributes of the first element with this tag, with lower-case names. */
function attributes(html: string, tag: string): Record<string, string> {
  const element = new RegExp(`<${tag}\\s([^>]*)>`).exec(html)?.[1] ?? ''
  return Object.fromEntries(
    [...element.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  )
}

describe('PreviewFrame', () => {
  it('keeps the preview address from other sites, and keeps the app page in place', () => {
    const html = renderToStaticMarkup(
      <>
        <PreviewFrame preview={preview} />
        <OpenInNewTab preview={preview} />
      </>,
    )

    const frame = attributes(html, 'iframe')
    const link = attributes(html, 'a')
    const flags = (frame.sandbox ?? '').split(' ')
    expect(frame.src).toBe(preview.url)
    expect(frame.referrerpolicy).toBe('no-referrer')
    expect(flags).toContain('allow-scripts')
    expect(flags).toContain('allow-same-origin')
    expect(flags.filter((flag) => flag.includes('top-navigation'))).toEqual([])
    expect(link.href).toBe(preview.url)
    expect(link.target).toBe('_blank')
    expect((link.rel ?? '').split(' ')).toContain('noreferrer')
    expect(link.referrerpolicy).toBe('no-referrer')
  })
})
