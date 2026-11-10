import type { BackendActor } from './backend-test-platform'

export function backendPump(
  actors: Map<string, BackendActor>,
  now: () => number,
  advanceTo: (at: number) => Promise<unknown>,
) {
  let wake: () => void = () => {}
  let work = new Promise<void>((resolve) => {
    wake = resolve
  })
  const changed = () => {
    const previous = wake
    work = new Promise<void>((resolve) => {
      wake = resolve
    })
    previous()
  }
  return {
    changed,
    run: async <T>(operation: () => Promise<T>): Promise<T> => {
      const existing = new Map(
        await Promise.all(
          [...actors.entries()].map(
            async ([id, actor]) => [id, await actor.checkpoint()] as const,
          ),
        ),
      )
      let finished = false
      const result = operation().finally(() => {
        finished = true
        changed()
      })
      void result.catch(() => undefined)
      while (!finished) {
        const signal = work
        const checkpoints = await Promise.all(
          [...actors.entries()].map(async ([id, actor]) => {
            let state = await actor.checkpoint()
            if (
              state.job?.phase === 'runner' &&
              !state.job.cancelled &&
              !state.job.failure
            ) {
              await actor
                .endpoint()
                .reportRunnerLifecycle({ type: 'runner.ready' })
              state = await actor.checkpoint()
            }
            return { id, ...state }
          }),
        )
        if (finished) break
        // A completed start can still have its response in transit.
        const next = checkpoints
          .filter(
            (state) =>
              state.job !== undefined &&
              state.alarmAt !== null &&
              (state.alarmAt <= now() ||
                (state.startPending &&
                  (state.instanceId !== existing.get(state.id)?.instanceId ||
                    state.alarmGeneration >
                      (existing.get(state.id)?.alarmGeneration ?? -1)))),
          )
          .sort((a, b) => (a.alarmAt ?? Infinity) - (b.alarmAt ?? Infinity))[0]
        if (!next || (next.alarmAt ?? Infinity) > now() + 60_000) {
          await Promise.race([
            signal,
            result.then(
              () => undefined,
              () => undefined,
            ),
          ])
        } else await advanceTo(Math.max(now(), next.alarmAt ?? now()))
      }
      return result
    },
  }
}
