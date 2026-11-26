import { expect, it, vi } from 'vitest'

import { FakeAppServers } from '../test-support/app-server'
import { providerFixture } from '../test-support/fixture'
import { listCodexSkills } from './skill-codex'

it('closes a Codex app server that gives no skills answer at the scanner deadline', async () => {
  const h = await providerFixture()
  const servers = new FakeAppServers()
  let requested: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    requested = resolve
  })
  servers.prepare = (server) => {
    server.unanswered.add('skills/list')
    const write = server.write.bind(server)
    vi.spyOn(server, 'write').mockImplementation((line) => {
      write(line)
      if (server.writes.at(-1)?.method === 'skills/list') requested()
    })
  }
  vi.useFakeTimers()
  try {
    const listed = listCodexSkills({
      home: h.home,
      repository: h.root,
      start: servers.start,
      timeoutMs: 5000,
    })
    await ready
    await Promise.all([
      vi.advanceTimersByTimeAsync(5000),
      expect(listed).rejects.toThrow('The Codex app server did not answer.'),
    ])
    expect(servers.latest.closed).toBe(true)
  } finally {
    vi.useRealTimers()
  }
})
