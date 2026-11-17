import { describe, expect, it } from 'vitest'

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
      view: {
        panes: [{ tabs: view.tabs, activeTab: view.activeTab, temporaryTab }],
        focusedPane: 0,
        fileList: view.fileList,
        tool: view.tool,
      },
      automation: null,
      repositoryFolder: null,
    })
  }
})

it('reads missing, invalid, and closed temporary marks as null', () => {
  expect(readViewReply({ view }).view).toEqual({
    panes: [{ tabs: view.tabs, activeTab: view.activeTab, temporaryTab: null }],
    focusedPane: 0,
    fileList: view.fileList,
    tool: view.tool,
  })
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
      panes: [
        { tabs: view.tabs, activeTab: view.activeTab, temporaryTab: null },
      ],
      focusedPane: 0,
      fileList: view.fileList,
      tool: view.tool,
    })
  }
})

describe('readViewReply', () => {
  it('keeps the absolute folder of the repository', () => {
    const reply = readViewReply({
      view,
      repositoryFolder: '/home/user/code/checkout',
    })
    expect(reply.repositoryFolder).toBe('/home/user/code/checkout')
  })

  it.each([
    ['no folder', undefined],
    ['a null folder', null],
    ['a relative folder', 'code/checkout'],
    ['a folder with a last slash', '/home/user/code/checkout/'],
    ['the root', '/'],
    ['a folder with a line break', '/home/user/code\n/checkout'],
    ['a number', 7],
  ])('gives no folder for %s', (_, repositoryFolder) => {
    expect(readViewReply({ view, repositoryFolder }).repositoryFolder).toBe(
      null,
    )
  })
})

it('reads panes and their own marks instead of the compatibility row of a reply', () => {
  const file = { kind: 'file', path: 'left.ts', mode: 'source' }
  const diff = { kind: 'diff', path: 'right.ts' }
  const panes = [
    {
      tabs: [file],
      activeTab: file,
      temporaryTab: { kind: 'file', path: 'left.ts' },
    },
    { tabs: [diff], activeTab: diff, temporaryTab: diff },
  ]
  expect(
    readViewReply({
      view: {
        ...view,
        panes,
        focusedPane: 1,
        tabs: [file, diff],
        activeTab: diff,
        temporaryTab: diff,
      },
    }).view,
  ).toEqual({
    panes,
    focusedPane: 1,
    fileList: 'all',
    tool: 'terminal',
  })
})
