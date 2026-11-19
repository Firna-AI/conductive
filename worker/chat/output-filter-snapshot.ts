import type { HeldOutput } from '../../src/shared/output-symbolic'

export function unreleasedOutput(
  snapshot: readonly HeldOutput[],
): HeldOutput[] {
  return snapshot.flatMap((held) =>
    held.event.text
      ? [
          held.symbolic
            ? { ...held, symbolic: { ...held.symbolic, contexts: [] } }
            : { event: held.event, secrets: held.secrets },
        ]
      : [],
  )
}

export function releasedOutput(snapshot: readonly HeldOutput[]): HeldOutput[] {
  return snapshot.flatMap<HeldOutput>((held) => {
    if (held.symbolic)
      return held.symbolic.contexts.length
        ? [
            {
              ...held,
              event: { ...held.event, text: '' },
              symbolic: { ...held.symbolic, matches: undefined },
            },
          ]
        : []
    return held.contexts?.length
      ? [
          {
            event: { ...held.event, text: '' },
            secrets: [],
            contexts: held.contexts,
          },
        ]
      : []
  })
}
