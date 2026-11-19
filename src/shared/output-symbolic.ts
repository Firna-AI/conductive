import type { RunnerEvent } from './generated/RunnerEvent'
import type { HeldOutput as LegacyHeldOutput } from './output-sanitizer-legacy'
import {
  appendSecretBuffer,
  saveSecretBuffer,
  secretBuffer,
  type SecretCandidate,
  type SecretMatches,
} from './secret-held'
import {
  protectSecretBuffer,
  resumeCandidates,
  scanSecretBuffer,
} from './secret-held-scan'
import {
  mergeContinuations,
  type SecretContinuation,
} from './secret-held-contexts'

type Delta = Extract<RunnerEvent, { type: 'assistant.delta' }>

export interface SymbolicHeldOutput {
  event: Delta
  secrets: readonly []
  contexts?: never
  symbolic: {
    salt: string
    matches?: SecretMatches
    contexts: SecretContinuation[]
  }
}

export type HeldOutput =
  (LegacyHeldOutput & { symbolic?: undefined }) | SymbolicHeldOutput

export interface OutputMatching {
  enabled: boolean
  salt: string
  candidates(salt: string): readonly SecretCandidate[]
}

export function answerContexts(
  texts: readonly string[],
  candidates: readonly SecretCandidate[],
): SecretContinuation[] {
  return mergeContinuations(
    texts.flatMap(
      (text) =>
        scanSecretBuffer(secretBuffer({ text }), candidates, true).contexts,
    ),
  )
}

/** Each instance owns one answer, including its released continuation contexts. */
export class SymbolicOutputSanitizer {
  private held: SymbolicHeldOutput
  private readonly candidates: readonly SecretCandidate[]

  constructor(held: SymbolicHeldOutput, matching: OutputMatching) {
    this.held = held
    this.candidates = matching.candidates(held.symbolic.salt)
  }

  snapshot(): SymbolicHeldOutput[] {
    return this.held.event.text || this.held.symbolic.contexts.length
      ? [this.held]
      : []
  }

  accept(event: RunnerEvent): RunnerEvent[] {
    if (event.type === 'assistant.delta') return this.delta(event, false)
    const output = this.held.event.text
      ? this.delta({ ...this.held.event, text: '' }, true)
      : []
    if (event.type === 'assistant.completed') {
      const completed = scanSecretBuffer(
        secretBuffer({ text: event.text }),
        this.candidates,
        true,
      )
      const contexts = mergeContinuations([
        ...this.held.symbolic.contexts,
        ...completed.contexts,
      ])
      this.held = {
        ...this.held,
        event: { ...event, type: 'assistant.delta', text: '' },
        symbolic: { ...this.held.symbolic, matches: undefined, contexts },
      }
      return [...output, { ...event, text: completed.text }]
    }
    return output
  }

  private delta(event: Delta, final: boolean): RunnerEvent[] {
    const old = this.held
    const continuations = old.symbolic.contexts.flatMap((context) => {
      const candidate = this.candidates.find(
        (candidate) => candidate.identity === context.identity,
      )
      return candidate
        ? [
            {
              identity: candidate.identity,
              value: candidate.value.slice(context.matched),
              start: context.matched,
            },
          ]
        : []
    })
    const buffer = appendSecretBuffer(
      secretBuffer({ text: old.event.text, matches: old.symbolic.matches }),
      event.text,
    )
    const candidates = resumeCandidates(buffer, [
      ...this.candidates,
      ...continuations,
    ])
    const result = scanSecretBuffer(buffer, candidates, final)
    const safe = saveSecretBuffer(protectSecretBuffer(result.held, candidates))
    this.held = {
      event: { ...event, text: safe.text },
      secrets: [],
      symbolic: {
        salt: old.symbolic.salt,
        matches: safe.matches,
        contexts: result.contexts,
      },
    }
    return result.text ? [{ ...event, text: result.text }] : []
  }
}
