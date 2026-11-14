// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../../app/navigation'
import { mount } from '../../../test-support/mount'
import { useAddressLines } from './address-lines'

const lineHref = '/orgs/o/workspaces/w/files/source/src/app.ts?line=4-9'

/** Writes the lines and the visit that the hook gives. */
function Probe() {
  const marked = useAddressLines()
  return (
    <p>
      {marked
        ? `${marked.visit}:${marked.range.start}-${marked.range.end}`
        : 'none'}
    </p>
  )
}

describe('useAddressLines', () => {
  it('counts each visit of an address with lines, also of the same address', async () => {
    const navigation = memoryNavigation(lineHref)
    const view = await mount(
      <NavigationContext.Provider value={navigation}>
        <Probe />
      </NavigationContext.Provider>,
    )
    const text = () => view.container.textContent
    const first = text()
    await act(async () => navigation.push(lineHref))
    const again = text()
    await act(async () =>
      navigation.push('/orgs/o/workspaces/w/files/source/src/app.ts'),
    )
    const without = text()
    expect({ first, again, without }).toEqual({
      first: '0:4-9',
      again: '1:4-9',
      without: 'none',
    })
  })
})
