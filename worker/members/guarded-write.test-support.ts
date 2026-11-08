export function interceptMembersWrite(
  database: D1Database,
  beforeWrite: () => Promise<unknown>,
) {
  let calls = 0
  const originals = new WeakMap<D1PreparedStatement, D1PreparedStatement>()
  const intercept = async () => {
    if (calls > 0) return
    calls += 1
    await beforeWrite()
  }
  const statement = (
    original: D1PreparedStatement,
    writes: boolean,
  ): D1PreparedStatement => {
    const wrapped = new Proxy(original, {
      get(target, key, receiver) {
        if (key === 'bind')
          return (...values: unknown[]) =>
            statement(target.bind(...values), writes)
        if (key === 'run' && writes)
          return async () => {
            await intercept()
            return target.run()
          }
        if (key === 'first' && writes)
          return async <T>(column?: string) => {
            await intercept()
            return column === undefined
              ? target.first<T>()
              : target.first<T>(column)
          }
        return Reflect.get(target, key, receiver)
      },
    })
    originals.set(wrapped, original)
    return wrapped
  }
  const db = new Proxy(database, {
    get(target, key, receiver) {
      if (key === 'prepare')
        return (query: string) =>
          statement(
            target.prepare(query),
            /^(INSERT|UPDATE|DELETE)\b/i.test(query.trimStart()),
          )
      if (key === 'batch')
        return async <T>(statements: D1PreparedStatement[]) => {
          await intercept()
          return target.batch<T>(
            statements.map((item) => originals.get(item) ?? item),
          )
        }
      return Reflect.get(target, key, receiver)
    },
  })
  return { db, calls: () => calls }
}
