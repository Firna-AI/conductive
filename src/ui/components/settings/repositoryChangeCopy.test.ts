import { expect, test } from 'vitest'
import { repositoryNoticeText } from './repositoryChangeCopy'

test('a failed build is the title when only removed repositories wait', () => {
  expect(
    repositoryNoticeText({
      wait: 'failed',
      added: [],
      removed: ['acme/api', 'acme/web'],
      admin: true,
    }),
  ).toEqual({
    title: 'The last build failed',
    body: 'acme/api and acme/web leave after a build succeeds.',
  })
})

test('a failed build names added and removed repositories in the body', () => {
  expect(
    repositoryNoticeText({
      wait: 'failed',
      added: ['acme/admin-dashboard'],
      removed: ['acme/api'],
      admin: false,
    }),
  ).toEqual({
    title: 'The last build failed',
    body: 'acme/admin-dashboard is ready after a build succeeds. acme/api leaves at the same build. An admin can try it again.',
  })
})

test('a removal without a failed build keeps its title', () => {
  expect(
    repositoryNoticeText({
      wait: 'waiting',
      added: [],
      removed: ['acme/api'],
      admin: false,
    }),
  ).toEqual({
    title: 'acme/api leaves at the next build',
    body: 'An admin can start the build.',
  })
})
