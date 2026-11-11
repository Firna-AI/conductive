export function deferredImport() {
  let complete: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    complete = resolve
  })
  return { promise, resolve: () => complete() }
}
