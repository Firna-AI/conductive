import { describe, expect, it } from 'vitest'

import { readViewReply } from './read-view'

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
      automation: null,
      repositoryFolder: null,
      heldRepositoryIds: null,
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

  it('keeps the repositories that the cloud computer holds', () => {
    const heldRepositoryIds = ['storefront', 'billing-service']
    expect(
      readViewReply({ view, heldRepositoryIds }).heldRepositoryIds,
    ).toEqual(heldRepositoryIds)
  })

  it.each([
    ['no list', undefined],
    ['a null list', null],
    ['a list with a number', ['storefront', 7]],
    ['a text', 'storefront'],
  ])('gives no repositories for %s', (_, heldRepositoryIds) => {
    expect(readViewReply({ view, heldRepositoryIds }).heldRepositoryIds).toBe(
      null,
    )
  })
})

describe('Preview tabs', () => {
  it('reads each Preview tab at its place, also as the active tab', () => {
    const reply = readViewReply({
      view: {
        ...view,
        previewTabs: [{ port: 3000, place: 1 }],
        activePreview: 3000,
      },
    })
    expect(reply.view.tabs).toEqual([
      view.tabs[0],
      { kind: 'preview', port: 3000 },
      view.tabs[1],
    ])
    expect(reply.view.activeTab).toEqual({ kind: 'preview', port: 3000 })
  })

  it('reads a view of an older Worker, with no Preview tab', () => {
    expect(readViewReply({ view }).view.tabs).toEqual(view.tabs)
  })

  it('keeps the shown terminal next to Preview tabs', () => {
    const previewTabs = [{ port: 3000, place: 0 }]
    const reply = readViewReply({
      view: { ...view, previewTabs, terminal: 'workspace' },
    })
    expect(reply.view.terminal).toBe('workspace')
    expect(reply.view.tabs[0]).toEqual({ kind: 'preview', port: 3000 })
    for (const terminal of ['other', 2, null]) {
      const read = readViewReply({ view: { ...view, previewTabs, terminal } })
      expect(read.view).not.toHaveProperty('terminal')
    }
  })

  it('refuses a Preview tab without a port from 1 to 65535', () => {
    for (const port of [0, 65536, 80.5, '3000', null]) {
      expect(() =>
        readViewReply({
          view: { ...view, previewTabs: [{ port, place: 0 }] },
        }),
      ).toThrow()
    }
  })
})

describe('skill tabs', () => {
  const plans = { agent: 'claude', name: 'plans' }
  const review = { agent: 'codex', name: 'review' }

  it('reads each skill tab at its place in the whole row, after the Preview tabs take theirs, with its active and temporary marks', () => {
    const reply = readViewReply({
      view: {
        ...view,
        previewTabs: [{ port: 3000, place: 1 }],
        skillTabs: [
          { ...review, place: 9 },
          { ...plans, place: 0 },
        ],
        activeSkill: review,
        temporarySkill: plans,
      },
    })
    expect(reply.view).toEqual({
      ...view,
      tabs: [
        { kind: 'skill', ...plans },
        view.tabs[0],
        { kind: 'preview', port: 3000 },
        view.tabs[1],
        { kind: 'skill', ...review },
      ],
      activeTab: { kind: 'skill', ...review },
      temporaryTab: { kind: 'skill', ...plans },
    })
  })

  it('drops a skill tab that does not read, and a mark that names no open skill tab, and keeps the rest of the view', () => {
    const reply = readViewReply({
      view: {
        ...view,
        skillTabs: [
          { agent: 'gemini', name: 'plans', place: 0 },
          { agent: 'claude', name: 'two words', place: 0 },
          { ...plans, place: -1 },
          { ...review, place: 1 },
        ],
        activeSkill: plans,
        temporarySkill: { agent: 'codex', name: 'closed' },
      },
    })
    expect(reply.view).toEqual({
      ...view,
      tabs: [view.tabs[0], { kind: 'skill', ...review }, view.tabs[1]],
      temporaryTab: null,
    })
  })
})
