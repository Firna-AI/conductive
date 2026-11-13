import { describe, expect, it } from 'vitest'
import { addressLines, filesHref, filesPlace } from './files-address'

const file = { kind: 'file', path: 'src/app.ts', mode: 'source' } as const

describe('the lines of a file tab address', () => {
  it('writes the lines in the query and reads them back', () => {
    const href = filesHref('org', 'ws', file, { start: 4, end: 9 })
    const url = new URL(href, 'https://app.invalid')
    expect({
      href,
      lines: addressLines(url.search),
      place: filesPlace(url.pathname.split('/').slice(5)),
    }).toEqual({
      href: '/orgs/org/workspaces/ws/files/source/src/app.ts?line=4-9',
      lines: { start: 4, end: 9 },
      place: file,
    })
  })

  it('gives a file tab without lines no query, and reads no lines from it', () => {
    const href = filesHref('org', 'ws', file)
    expect({ href, lines: addressLines('') }).toEqual({
      href: '/orgs/org/workspaces/ws/files/source/src/app.ts',
      lines: null,
    })
  })

  it.each(['?line=0', '?line=9-4', '?line=x', '?other=4'])(
    'reads no lines from %s',
    (search) => {
      expect(addressLines(search)).toBe(null)
    },
  )
})
