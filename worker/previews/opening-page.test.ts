import { expect, it } from 'vitest'

import { previewOpeningCopy } from '../../src/ui/components/tools/previewCopy'
import { previewBrowserDocument } from './browser-launch'
import { previewLaunchDocument } from './launch-document'

const launch = previewLaunchDocument({
  action: 'https://authorize.previews.test/.conductive/authorize',
  hostname: `${'a'.repeat(32)}.previews.test`,
  grant: 'grant-value',
  nonce: 'launch-nonce',
  appOrigin: 'https://app.test',
  desktopOrigin: 'conductive-app://desktop',
})
const browser = previewBrowserDocument('browser-nonce')

it.each([
  ['launch', launch, 'launch-nonce'],
  ['authorizer', browser, 'browser-nonce'],
])(
  'gives the %s page the opening status with only nonce styles and scripts',
  (_name, page, nonce) => {
    expect(page.policy).toContain(`script-src 'nonce-${nonce}'`)
    expect(page.policy).toContain(`style-src 'nonce-${nonce}'`)
    expect(page.policy).toMatch(/^default-src 'none';/)
    expect(page.html).toContain(`<style nonce="${nonce}">`)
    expect(page.html).toContain(`<script nonce="${nonce}">`)
    expect(page.html).toContain(`<p class="line"><svg class="ring"`)
    expect(page.html).toContain(`>${previewOpeningCopy.opening}</span>`)
    expect(page.html).toContain('role="status"')
    // One file: no font, image, stylesheet, or script loads beside it.
    expect(page.html).not.toMatch(/\s(src|href)=/)
    expect(page.html.match(/url\(/g)).toEqual(['url('])
    expect(page.html).toContain('fill="url(#tile)"')
  },
)

it('keeps the two launch form fields beside the status', () => {
  const fields = [...launch.html.matchAll(/<input[^>]*name="([^"]+)"/g)]
  expect(fields.map((field) => field[1])).toEqual(['hostname', 'grant'])
  expect(launch.html).toContain('document.forms[0].submit()')
})

it('defines the failure before the authorizer script can call it', () => {
  const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(
    browser.html,
  )?.[1]
  expect(script?.indexOf('const failPreview')).toBeGreaterThanOrEqual(0)
  expect(script?.indexOf('const failPreview')).toBeLessThan(
    script?.indexOf('failPreview()') ?? 0,
  )
  expect(script).toContain(JSON.stringify(previewOpeningCopy.failedTitle))
  expect(script).toContain(JSON.stringify(previewOpeningCopy.failedBody))
})
