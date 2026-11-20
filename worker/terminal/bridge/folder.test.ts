import { expect, it } from 'vitest'

import { terminalFolder } from './folder'

const argument = '/home/user/code/storefront'

it('uses the folder of the command line without a folder file', () => {
  expect(
    terminalFolder(
      argument,
      () => null,
      () => true,
    ),
  ).toBe(argument)
})

it('uses the folder of a repository change when it exists', () => {
  expect(
    terminalFolder(
      argument,
      () => '/home/user/code/billing-service\n',
      (path) => path === '/home/user/code/billing-service',
    ),
  ).toBe('/home/user/code/billing-service')
})

it('keeps the command line for a missing or an unsafe folder', () => {
  for (const text of [
    '/home/user/code/billing-service\n',
    '/home/user/code/..\n',
    '/etc\n',
    '/home/user/code/a/b\n',
    '/home/user/code/billing service\n',
    '',
  ])
    expect(
      terminalFolder(
        argument,
        () => text,
        (path) => path !== '/home/user/code/billing-service',
      ),
    ).toBe(argument)
})
