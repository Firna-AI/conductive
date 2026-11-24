import { MACHINE_TOKEN_PATTERN } from '../machines/authorization'
import type { CommandStatus } from '../machines/channel'
import { hideMachineTokens } from './build-machine-token'

const fullToken = new RegExp(`^${MACHINE_TOKEN_PATTERN}$`, 'u')
const tokenExample = `cndm1.${'0'.repeat(64)}.${'0'.repeat(43)}`

function tokenPrefixLength(text: string): number {
  const limit = Math.min(text.length, tokenExample.length - 1)
  for (let length = limit; length > 0; length--) {
    // Complete a possible prefix with the corresponding bytes of a valid token.
    if (fullToken.test(text.slice(-length) + tokenExample.slice(length)))
      return length
  }
  return 0
}

function redactStream(text: string, nextOffset: number, waiting: boolean) {
  const masked = hideMachineTokens(text)
  const held = waiting ? tokenPrefixLength(masked) : 0
  // The held suffix is ASCII, so its length also counts its raw bytes.
  return {
    text: masked.slice(0, masked.length - held),
    offset: nextOffset - held,
  }
}

/** The redactor alone supplies command text and the offsets to save with it. */
export class RedactedCommandOutput {
  private readonly value: string
  readonly stdoutOffset: number
  readonly stderrOffset: number

  private constructor(
    text: string,
    stdoutOffset: number,
    stderrOffset: number,
  ) {
    this.value = text
    this.stdoutOffset = stdoutOffset
    this.stderrOffset = stderrOffset
  }

  static redact(status: CommandStatus): RedactedCommandOutput {
    const waiting = status.running || status.more
    const stdout = redactStream(status.stdout, status.stdoutNextOffset, waiting)
    const stderr = redactStream(status.stderr, status.stderrNextOffset, waiting)
    return new RedactedCommandOutput(
      hideMachineTokens(stdout.text + stderr.text),
      stdout.offset,
      stderr.offset,
    )
  }

  get text(): string {
    return this.value
  }
}
