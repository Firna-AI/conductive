import { expect, it } from 'vitest'

import { PREVIEW_RELAY_PORT } from '../../src/shared/previews'
import { procFixture } from '../test-support/proc'
import { ProcPortScanner } from './proc-ports'

function fixture() {
  const proc = procFixture()
  const scanner = new ProcPortScanner({
    uid: 1000,
    home: '/home/user',
    cwd: '/home/user/code/web',
    reader: proc.reader,
  })
  return { ...proc, scanner }
}

it('finds only same-user wildcard and loopback listeners and returns sorted unique ports', async () => {
  const h = fixture()
  h.sockets(
    [
      { port: 5000 },
      { port: 3000, address: '0100007F' },
      { port: 3001, address: '0200007F' },
      { port: 3002, address: '0100A8C0' },
      { port: 3003, uid: 0 },
      { port: 3004, state: '01' },
      { port: 7681 },
      { port: PREVIEW_RELAY_PORT },
      { port: 8911, inode: '23780' },
      { port: 8911, ipv6: true, inode: '21646' },
      { port: 47984, address: '0100007F', inode: '93782' },
      { port: 47989, address: '0100007F', inode: '93182' },
      { port: 47990, address: '0100007F', inode: '93180' },
      { port: 48010, address: '0100007F', inode: '94983' },
      { port: 8912 },
      { port: 47985, address: '0100007F' },
      { port: 0 },
      { port: 5000, ipv6: true },
      { port: 4000, ipv6: true, address: '00000000000000000000000001000000' },
      { port: 4001, ipv6: true, address: '0000000000000000FFFF00000100007F' },
      { port: 4002, ipv6: true, address: 'B80D0120000000000000000001000000' },
    ],
    'bad row\n0: ZZZZZZZZ:1234 0:0 0A 0:0 0:0 0 1000 0 9',
  )
  expect(await h.scanner.scan()).toEqual([
    { port: 3000, name: null, folder: null },
    { port: 3001, name: null, folder: null },
    { port: 4000, name: null, folder: null },
    { port: 4001, name: null, folder: null },
    { port: 5000, name: null, folder: null },
    { port: 8912, name: null, folder: null },
    { port: 47985, name: null, folder: null },
  ])
})

it('keeps only safe program names and an allowed next word without reading environment values', async () => {
  const h = fixture()
  const cases = [
    {
      command: [
        '/usr/bin/node',
        '/repo/node_modules/.bin/vite',
        'dev',
        '--token=Secret42',
      ],
      name: 'vite dev',
    },
    { command: ['python3', '-m', 'http.server', '8000'], name: 'http.server' },
    {
      command: ['deno', 'run', '--allow-net', '/repo/server.ts', 'serve'],
      name: 'server.ts serve',
    },
    {
      command: ['bun', 'run', '/repo/server.ts', 'dev'],
      name: 'server.ts dev',
    },
    { command: ['/repo/program', '--password=secret'], name: 'program' },
    { command: ['/repo/program', '--host'], name: 'program' },
    { command: ['node', '/repo/server.js', 'dev2'], name: 'server.js' },
    { command: ['node', '/repo/server.js', 'Secret'], name: 'server.js' },
    { command: ['node', '-e', 'Secret42'], name: null },
    {
      command: [`/repo/${'x'.repeat(50)}`, 'serve'],
      name: `${'x'.repeat(50)} serve`,
    },
  ]
  h.sockets(cases.map((_, index) => ({ port: 3000 + index })))
  for (const [index, test] of cases.entries())
    h.process(
      String(index),
      [String(3000 + index)],
      test.command,
      '/home/user/code/web',
    )
  expect(await h.scanner.scan()).toEqual(
    cases.map((test, index) => ({
      port: 3000 + index,
      name: test.name,
      folder: null,
    })),
  )
  expect(h.reads.some((path) => path.endsWith('/environ'))).toBe(false)
})

it('keeps complete folders only within repository paths', async () => {
  const h = fixture()
  const tail = 'a'.repeat(119)
  const cases = [
    { cwd: '/home/user/code/web', folder: null },
    { cwd: '/home/user/code/web/apps/web', folder: 'apps/web' },
    { cwd: '/home/user/code/api', folder: 'api' },
    { cwd: '/home/user/code/api/server', folder: 'api/server' },
    { cwd: '/home/user/code', folder: null },
    { cwd: '/home/user/code-other/private', folder: null },
    { cwd: '/tmp/private', folder: null },
    { cwd: `/home/user/code/web/long/${tail}`, folder: `long/${tail}` },
  ]
  h.sockets(cases.map((_, index) => ({ port: 3000 + index })))
  for (const [index, test] of cases.entries())
    h.process(
      String(index),
      [String(3000 + index)],
      ['/usr/bin/vite'],
      test.cwd,
    )
  expect(await h.scanner.scan()).toEqual(
    cases.map((test, index) => ({
      port: 3000 + index,
      name: 'vite',
      folder: test.folder,
    })),
  )
})

it('caches metadata for a socket and recovers when a process exits during lookup', async () => {
  const h = fixture()
  h.sockets([
    { port: 3000, inode: '100' },
    { port: 3001, inode: '101' },
  ])
  h.process('10', ['100'], ['vite', 'dev'], '/home/user/code/web/app')
  h.process('11', ['101'], ['secret-program'], '/tmp/private')
  h.unreadable('11')
  const expected = [
    { port: 3000, name: 'vite dev', folder: 'app' },
    { port: 3001, name: null, folder: null },
  ]
  expect(await h.scanner.scan()).toEqual(expected)
  h.reads.length = 0
  h.process('10', ['100'], ['changed'], '/home/user/code/api')
  expect(await h.scanner.scan()).toEqual(expected)
  expect(h.reads).toEqual(['/proc/net/tcp', '/proc/net/tcp6'])
  h.sockets([{ port: 3000, inode: '102' }])
  h.process('12', ['102'], ['astro', 'dev'], '/home/user/code/api')
  expect(await h.scanner.scan()).toEqual([
    { port: 3000, name: 'astro dev', folder: 'api' },
  ])
})

it('keeps complete selected labels and discards a rewritten interpreter title', async () => {
  const h = fixture()
  h.sockets([{ port: 3000 }, { port: 3001 }])
  h.process(
    '10',
    ['3000'],
    [
      'node',
      '/repo/development-server-entry-point',
      'secretpass',
      '--token=UNSELECTED',
    ],
    `/home/user/code/web/secretpass/${'z'.repeat(115)}`,
    '/usr/local/bin/node',
  )
  h.process(
    '11',
    ['3001'],
    ['vite --token FAKE_TOKEN_42'],
    '/home/user/code/web/app',
    '/usr/local/bin/node',
  )
  expect(await h.scanner.scan()).toEqual([
    {
      port: 3000,
      name: 'development-server-entry-point secretpass',
      folder: `secretpass/${'z'.repeat(115)}`,
    },
    { port: 3001, name: null, folder: 'app' },
  ])
})
