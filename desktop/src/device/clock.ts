export interface DeviceClock {
  now(): number
  after(milliseconds: number, callback: () => void): () => void
}

export const deviceClock: DeviceClock = {
  now: () => Date.now(),
  after: (milliseconds, callback) => {
    const timer = setTimeout(callback, milliseconds)
    return () => clearTimeout(timer)
  },
}
