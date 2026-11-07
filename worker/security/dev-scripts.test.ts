import { expect, it } from 'vitest'

import { developmentScripts } from '../../vite.config'

it('serves every injected development script from its own external source', () => {
  const plugin = developmentScripts()
  const preamble = 'import "/@react-refresh"; window.refreshReady = true'
  const injected = 'window.otherPluginReady = true'
  const html = plugin.transformIndexHtml.handler(`
    <script type="module" data-owner="react > refresh src=metadata">${preamble}</script>
    <script src="/@vite/client" type="module"></script>
    <script data-owner="another plugin">${injected}</script>
  `)
  expect(html).not.toContain(preamble)
  expect(html).not.toContain(injected)
  expect(html).toContain('data-owner="react > refresh src=metadata"')
  expect(html).toContain('data-owner="another plugin"')
  const sources = [...html.matchAll(/\ssrc="([^"]+)"/g)].map(
    (match) => match[1],
  )
  expect(sources).toHaveLength(3)
  expect(sources[1]).toBe('/@vite/client')
  expect(plugin.resolveId(sources[1])).toBeNull()
  expect(plugin.load(plugin.resolveId(sources[0]) ?? '')).toBe(preamble)
  expect(plugin.load(plugin.resolveId(sources[2]) ?? '')).toBe(injected)
  expect(plugin.load('unrelated-module')).toBeNull()
  expect(plugin.transformIndexHtml.handler(html)).toBe(html)
  expect(plugin.apply({}, { command: 'serve', mode: 'development' })).toBe(true)
  expect(plugin.apply({}, { command: 'build', mode: 'production' })).toBe(false)
  expect(
    plugin.apply({}, { command: 'serve', mode: 'production', isPreview: true }),
  ).toBe(false)
})
