import { describe, expect, test } from 'vitest'
import { routeOf } from '../../../app/navigation'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { previewPortHref, toolPlace } from './tool-address'

const portAddress = (port: number) =>
  previewPortHref(FAKE_IDS.org, FAKE_IDS.workspace, port)

/** The tool place of an address, as the workspace screen reads it. */
function placeOf(href: string) {
  const route = routeOf(href)
  return route.screen === 'workspace' ? toolPlace(route.view) : null
}

describe('the address of the Preview tool with a port', () => {
  test.each([
    { value: 'port 1', href: portAddress(1), port: 1 },
    { value: 'port 65535', href: portAddress(65535), port: 65535 },
    { value: 'port 0', href: portAddress(0), port: null },
    { value: 'port 65536', href: portAddress(65536), port: null },
    { value: 'a part of a port', href: portAddress(3000.5), port: null },
    {
      value: 'a leading zero',
      href: portAddress(3000).replace(/3000$/, '03000'),
      port: null,
    },
  ])('with $value shows the Preview tool with port $port', ({ href, port }) => {
    expect(placeOf(href)).toEqual({ tool: 'preview', previewId: null, port })
  })
})
