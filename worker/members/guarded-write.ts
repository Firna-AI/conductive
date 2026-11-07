interface GuardedMembersWrite<T> {
  checks: readonly (() => Promise<unknown>)[]
  write: () => Promise<T>
  refusal: () => Error
}

export async function guardedMembersWrite<T>({
  checks,
  write,
  refusal,
}: GuardedMembersWrite<T>): Promise<NonNullable<T>> {
  const check = async () => {
    for (const check of checks) await check()
  }
  await check()
  const result = await write()
  if (result) return result
  await check()
  throw refusal()
}
