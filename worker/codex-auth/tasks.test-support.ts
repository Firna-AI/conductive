import { codexTaskOwner } from './tasks'

export function fakeCodexTasks() {
  const tasks: Promise<unknown>[] = []
  const active = new Set<Promise<unknown>>()
  const execution = {
    waitUntil(task: Promise<unknown>) {
      tasks.push(task)
      active.add(task)
      void task.then(
        () => active.delete(task),
        () => active.delete(task),
      )
    },
  }
  const owner = codexTaskOwner(execution)
  return {
    owner,
    execution,
    tasks,
    active,
    async drain() {
      let through = 0
      while (through < tasks.length) {
        const batch = tasks.slice(through)
        through = tasks.length
        await Promise.allSettled(batch)
      }
    },
  }
}
