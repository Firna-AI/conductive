import type { StartRunTimer } from './start-run-timer'

type CallTimer = Pick<StartRunTimer, 'time'>

const TIMED = new Set(['first', 'run', 'all', 'raw'])

/**
 * Times each call of a D1 binding for the open start run. A statement is a
 * view of the real statement that reads every other field from it, so the
 * batch of any binding accepts it, as the test D1 binding already relies on.
 */
export function timedDatabase(db: D1Database, timer: CallTimer): D1Database {
  return new Proxy(db, {
    get: (target, key) => {
      const member: unknown = Reflect.get(target, key)
      if (typeof member !== 'function') return member
      if (key === 'prepare')
        return (query: string) => timedStatement(target.prepare(query), timer)
      if (key === 'batch' || key === 'exec')
        return (...args: unknown[]) =>
          timer.time('d1', `d1.${key}`, () =>
            Promise.resolve(Reflect.apply(member, target, args)),
          )
      return member.bind(target)
    },
  })
}

function timedStatement(
  statement: D1PreparedStatement,
  timer: CallTimer,
): D1PreparedStatement {
  return new Proxy(statement, {
    get: (target, key) => {
      const member: unknown = Reflect.get(target, key)
      if (typeof member !== 'function') return member
      if (key === 'bind')
        return (...values: unknown[]) =>
          timedStatement(target.bind(...values), timer)
      if (typeof key === 'string' && TIMED.has(key))
        return (...args: unknown[]) =>
          timer.time('d1', `d1.${key}`, () =>
            Promise.resolve(Reflect.apply(member, target, args)),
          )
      return member.bind(target)
    },
  })
}
