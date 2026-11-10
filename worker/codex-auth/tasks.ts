export interface CodexTaskOwner {
  run<T>(start: () => Promise<T>): Promise<T>
}

/** Credential work must be retained before its request can stop waiting. */
export function codexTaskOwner(
  execution: Pick<ExecutionContext, 'waitUntil'> | undefined,
): CodexTaskOwner {
  return {
    run(start) {
      if (!execution)
        throw new Error('The Codex credential task owner is missing.')
      const task = start()
      execution.waitUntil(task)
      return task
    },
  }
}
