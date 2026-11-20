import {
  answerContexts,
  type HeldOutput,
  type OutputMatching,
  type SymbolicHeldOutput,
} from '../../src/shared/output-symbolic'
import {
  saveSecretBuffer,
  secretBuffer,
  type SecretCandidate,
} from '../../src/shared/secret-held'
import {
  protectSecretBuffer,
  resumeCandidates,
} from '../../src/shared/secret-held-scan'
import type { HeldOutput as LegacyHeldOutput } from '../../src/shared/output-sanitizer-legacy'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { outputCandidates } from './output-filter-identity'

function retainedLegacy(
  snapshot: readonly LegacyHeldOutput[],
  active: ReadonlySet<string>,
): HeldOutput[] {
  return snapshot
    .map((held) => ({
      ...held,
      secrets: held.secrets.filter((value) => active.has(value)),
      contexts: held.contexts
        ?.map((context) => ({
          ...context,
          secrets: context.secrets.filter((value) => active.has(value)),
        }))
        .filter((context) => context.secrets.length),
    }))
    .filter((held) => held.event.text || held.contexts?.length)
}

function combineLegacy(snapshot: readonly HeldOutput[]): LegacyHeldOutput {
  const first = snapshot[0]
  const contexts = new Map<string, { text: string; secrets: string[] }>()
  for (const held of snapshot) {
    for (const context of held.contexts ?? [])
      contexts.set(context.text, {
        text: context.text,
        secrets: [
          ...new Set([
            ...(contexts.get(context.text)?.secrets ?? []),
            ...context.secrets,
          ]),
        ],
      })
  }
  return {
    event: first.event,
    secrets: [...new Set(snapshot.flatMap((held) => held.secrets))],
    contexts: [...contexts.values()],
  }
}

/** OFF prevents promotion; a previously symbolic answer never loses its format. */
export async function prepareOutputState(
  env: AppEnv,
  workspaceId: string,
  snapshot: readonly HeldOutput[],
  active: ReadonlySet<string>,
  before: ReadonlySet<string> = active,
): Promise<{ snapshot: HeldOutput[]; matching: OutputMatching }> {
  const enabled = env.CONDUCTIVE_SYMBOLIC_ANSWER_STATE === 'true'
  const salt = randomToken()
  const values = [
    ...new Set([
      ...active,
      ...before,
      ...snapshot.flatMap((held) =>
        held.symbolic
          ? []
          : [
              ...held.secrets,
              ...(held.contexts ?? []).flatMap((context) => context.secrets),
            ],
      ),
    ]),
  ]
  const tables = new Map<string, SecretCandidate[]>()
  const readCandidates = async (salt: string) => {
    let candidates = tables.get(salt)
    if (!candidates) {
      candidates = await outputCandidates(env, workspaceId, salt, values)
      tables.set(salt, candidates)
    }
    return candidates
  }
  if (enabled || snapshot.some((held) => held.symbolic))
    await readCandidates(salt)
  const matching: OutputMatching = {
    enabled,
    salt,
    candidates: (salt) =>
      (tables.get(salt) ?? []).filter((candidate) =>
        active.has(candidate.value),
      ),
  }
  const answers = new Map<string, HeldOutput[]>()
  for (const held of snapshot) {
    const key = JSON.stringify([
      held.event.sessionId,
      held.event.turnId,
      held.event.messageId,
    ])
    answers.set(key, [...(answers.get(key) ?? []), held])
  }
  const result: HeldOutput[] = []
  for (const group of answers.values()) {
    const previous = group.find((held) => held.symbolic)
    if (!enabled && !previous) {
      result.push(...retainedLegacy([combineLegacy(group)], active))
      continue
    }
    const selectedSalt = previous?.symbolic?.salt ?? salt
    const all = await readCandidates(selectedSalt)
    const current = all.filter((candidate) => active.has(candidate.value))
    const contexts = new Map<
      string,
      SymbolicHeldOutput['symbolic']['contexts'][number]
    >()
    const converted: SymbolicHeldOutput[] = []
    for (const held of group) {
      if (held.symbolic) {
        const old = await readCandidates(held.symbolic.salt)
        const identities = new Map(
          old
            .filter((candidate) => active.has(candidate.value))
            .flatMap((candidate) => {
              const target = current.find(
                (value) => value.value === candidate.value,
              )
              return target ? [[candidate.identity, target.identity]] : []
            }),
        )
        identities.set('marker', 'marker')
        const buffer = secretBuffer({
          text: held.event.text,
          matches: held.symbolic.matches,
        })
        buffer.entries = buffer.entries.flatMap((entry) => {
          const identity = identities.get(entry.identity)
          return identity ? [{ ...entry, identity }] : []
        })
        const safe = saveSecretBuffer(
          protectSecretBuffer(buffer, resumeCandidates(buffer, current)),
        )
        const refs = held.symbolic.contexts.flatMap((context) => {
          const identity = identities.get(context.identity)
          return identity ? [{ ...context, identity }] : []
        })
        converted.push({
          event: { ...held.event, text: safe.text },
          secrets: [],
          symbolic: {
            salt: selectedSalt,
            matches: safe.matches,
            contexts: refs,
          },
        })
      } else {
        const safe = saveSecretBuffer(
          protectSecretBuffer(
            secretBuffer({ text: held.event.text }),
            current,
            all,
          ),
        )
        const refs = (held.contexts ?? []).flatMap((context) =>
          answerContexts(
            [context.text],
            current.filter((candidate) =>
              context.secrets.includes(candidate.value),
            ),
          ),
        )
        converted.push({
          event: { ...held.event, text: safe.text },
          secrets: [],
          symbolic: {
            salt: selectedSalt,
            matches: safe.matches,
            contexts: refs,
          },
        })
      }
    }
    for (const held of converted)
      for (const context of held.symbolic.contexts)
        contexts.set(JSON.stringify(context), context)
    const first = converted[0]
    const held: SymbolicHeldOutput = {
      ...first,
      symbolic: { ...first.symbolic, contexts: [...contexts.values()] },
    }
    if (held.event.text || held.symbolic.contexts.length) result.push(held)
  }
  return { snapshot: result, matching }
}
