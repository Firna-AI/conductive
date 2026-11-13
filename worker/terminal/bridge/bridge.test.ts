import { afterEach, describe, expect, it } from 'vitest'

import { bridgeInputMessage } from '../../../src/shared/terminal-bridge'
import { numbers, runTmuxTests, tmuxServer } from './bridge.test-support'

type Server = Awaited<ReturnType<typeof tmuxServer>>
let server: Server | null = null

async function start(): Promise<Server> {
  server = await tmuxServer()
  return server
}

afterEach(() => {
  server?.stop()
  server = null
})

/** A prompt line of the login Bash, which differs between machines. */
const prompt = /\$ $/m

describe.skipIf(!runTmuxTests)('the terminal bridge with a real tmux', () => {
  it('passes every line of fast output, so xterm.js keeps the history', async () => {
    const tmux = await start()
    const viewer = tmux.connect(12, 60)
    await viewer.waitFor(prompt)
    viewer.write('seq 1 3000; echo END\r')
    await viewer.waitFor('END\r\n')
    const { lines, messages } = await viewer.screen()
    expect(messages[0]).toBe('hello;1;60;12')
    const shown = numbers(lines)
    expect(shown.at(-1)).toBe(3000)
    expect(shown.length).toBeGreaterThan(1_990)
    expect(
      shown.every(
        (value, index) => index === 0 || value === (shown[index - 1] ?? 0) + 1,
      ),
    ).toBe(true)
  }, 30_000)

  it('shows the history to a new connection, at the size of that connection', async () => {
    const tmux = await start()
    const first = tmux.connect(12, 60)
    await first.waitFor(prompt)
    first.write('seq 1 100; echo END\r')
    await first.waitFor('END\r\n')
    first.close()
    const second = tmux.connect(20, 70)
    await second.waitFor('END')
    await new Promise((done) => setTimeout(done, 300))
    const { lines, messages, buffer } = await second.screen()
    expect(messages[0]).toBe('hello;1;70;20')
    expect(numbers(lines)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
    expect(buffer.baseY).toBeGreaterThan(80)
    expect(
      tmux
        .tmux(
          'display-message',
          '-p',
          '-t',
          'workspace',
          '#{window_width}x#{window_height}',
        )
        .trim(),
    ).toBe('70x20')
  }, 30_000)

  it('rebuilds a full-screen program for a new connection, and the history after it', async () => {
    const tmux = await start()
    const first = tmux.connect(12, 60)
    await first.waitFor(prompt)
    first.write('seq 1 40; less /etc/passwd\r')
    await first.waitFor('/etc/passwd')
    first.close()
    const second = tmux.connect(12, 60)
    await second.waitFor('root:')
    await new Promise((done) => setTimeout(done, 300))
    const during = await second.screen()
    expect(during.buffer.type).toBe('alternate')
    expect(during.lines[0]).toMatch(/^root:/)
    second.write('q')
    await new Promise((done) => setTimeout(done, 500))
    const after = await second.screen()
    expect(after.buffer.type).toBe('normal')
    expect(numbers(after.lines)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    )
  }, 30_000)

  it('pastes with the bracketed paste marks of a program, also after a reconnect', async () => {
    const tmux = await start()
    const first = tmux.connect(12, 60)
    await first.waitFor(prompt)
    first.write("printf '\\033[?2004h'; od -c\r")
    await new Promise((done) => setTimeout(done, 300))
    first.close()
    const second = tmux.connect(12, 60)
    await second.waitFor(/\$ /)
    const nonce = second.nonce
    second.write(
      bridgeInputMessage(nonce, { kind: 'paste', base64: btoa('one\ntwo') }),
    )
    // The terminal device echoes the marks around the pasted text.
    await second.waitFor('^[[200~one\r\ntwo^[[201~')
    second.write('\x04')
    await second.waitFor(/033\s+\[\s+2\s+0\s+0\s+~/)
  }, 30_000)

  it('sends a lone Escape key on at once', async () => {
    const tmux = await start()
    const viewer = tmux.connect(12, 60)
    await viewer.waitFor(prompt)
    viewer.write('od -c\r')
    await new Promise((done) => setTimeout(done, 300))
    viewer.write('\x1b')
    await new Promise((done) => setTimeout(done, 300))
    viewer.write('\r\x04')
    // The terminal device turns the Return into a line feed.
    await viewer.waitFor(/033\s+\\n/)
  }, 30_000)

  it('gives the window the size of the viewer that typed last', async () => {
    const tmux = await start()
    const large = tmux.connect(12, 60)
    await large.waitFor(prompt)
    const small = tmux.connect(8, 40)
    await small.waitFor(';hello;1;40;8\x07')
    await large.waitFor(';size;40;8\x07')
    large.write('echo typed\r')
    await large.waitFor(';size;60;12\x07')
    await small.waitFor(';size;60;12\x07')
  }, 30_000)

  it('keeps a size that a program sets inside the limit, then takes its own size again', async () => {
    const tmux = await start()
    const viewer = tmux.connect(12, 60)
    await viewer.waitFor(prompt)
    tmux.tmux('resize-window', '-t', 'workspace', '-x', '9000', '-y', '9000')
    await viewer.waitFor(';size;60;12\x07')
    const { messages } = await viewer.screen()
    expect(messages.filter((message) => message.startsWith('size;'))).toEqual([
      'size;500;200',
      'size;60;12',
    ])
  }, 30_000)

  it('drops the output while the screen does not acknowledge, and rebuilds the screen when it caught up', async () => {
    const tmux = await start()
    const viewer = tmux.connect(12, 60)
    await viewer.waitFor(prompt)
    const nonce = viewer.nonce
    viewer.write(
      bridgeInputMessage(nonce, {
        kind: 'hello',
        foreground: '#111111',
        background: '#eeeeee',
      }),
    )
    viewer.write('yes | head -c 20000000; echo FINISHED\r')
    await new Promise((done) => setTimeout(done, 8_000))
    const held = viewer.output.length
    expect(held).toBeLessThan(2_000_000)
    expect(
      tmux
        .tmux('show-options', '-w', '-t', 'workspace', '-v', 'window-style')
        .trim(),
    ).toBe('fg=#111111,bg=#eeeeee')
    // Now the screen acknowledges each mark, as xterm.js parses it.
    const acknowledge = setInterval(() => {
      const marks = viewer.output.toString('latin1').split(';mark;')
      const mark = Number.parseInt(marks.at(-1) ?? '', 10) || 0
      if (mark > 0)
        viewer.write(bridgeInputMessage(nonce, { kind: 'ack', mark }))
    }, 100)
    try {
      // The rebuild draws each row after a cursor move.
      await viewer.waitFor(/(\n|H)FINISHED/, 30_000)
    } finally {
      clearInterval(acknowledge)
    }
    expect(viewer.output.length).toBeGreaterThan(held)
    const rebuilds =
      viewer.output.toString('latin1').split('\x1b[3J').length - 1
    expect(rebuilds).toBeGreaterThan(1)
  }, 60_000)

  it('ends the connection when the shell ends', async () => {
    const tmux = await start()
    const viewer = tmux.connect(12, 60)
    await viewer.waitFor(prompt)
    viewer.write('exit\r')
    expect(await viewer.exited).toBe(0)
  }, 30_000)
})
