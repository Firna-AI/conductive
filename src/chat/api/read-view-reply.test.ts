import { describe, expect, it } from 'vitest'
import { readViewReply } from './read-responses'

const view = {
  tabs: [],
  activeTab: null,
  fileList: 'all',
  tool: 'terminal',
}

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
