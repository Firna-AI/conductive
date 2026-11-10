export function heldOperation() {
  let enter: () => void = () => {}
  let release: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    entered,
    release,
    wait: async () => {
      enter()
      await pending
    },
  }
}
