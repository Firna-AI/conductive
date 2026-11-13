import { expect, it } from 'vitest'

import { readViewReply } from './read-responses'

const view = {
  tabs: [
    { kind: 'file', path: 'README.md', mode: 'source' },
    { kind: 'diff', path: 'src/app.ts' },
  ],
  activeTab: null,
  fileList: 'all',
  tool: 'terminal',
}

it('reads a temporary file or diff tab without a display mode', () => {
  for (const temporaryTab of [
    { kind: 'file', path: 'README.md' },
    { kind: 'diff', path: 'src/app.ts' },
  ]) {
    expect(readViewReply({ view: { ...view, temporaryTab } })).toEqual({
      view: { ...view, temporaryTab },
      routine: null,
    })
  }
})

it('reads missing, invalid, and closed temporary marks as null', () => {
  expect(readViewReply({ view }).view).toEqual({ ...view, temporaryTab: null })
  for (const temporaryTab of [
    null,
    'README.md',
    [],
    {},
    { kind: 'session', path: 'README.md' },
    { kind: 'file', path: '' },
    { kind: 'file', path: 42 },
    { kind: 'diff' },
    { kind: 'file', path: 'closed.ts' },
    { kind: 'diff', path: 'README.md' },
  ]) {
    expect(readViewReply({ view: { ...view, temporaryTab } }).view).toEqual({
      ...view,
      temporaryTab: null,
    })
  }
})
