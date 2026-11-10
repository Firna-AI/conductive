let installed = false
let capturing = false
let calls: unknown[][] = []

export function nativeWarningObservation() {
  if (!installed) {
    const warn = console.warn.bind(console)
    console.warn = (...values: unknown[]) => {
      if (capturing) calls.push(values)
      warn(...values)
    }
    installed = true
  }
  return {
    captureWarnings: async (active: boolean) => {
      calls = []
      capturing = active
    },
    warningCount: async () => calls.length,
    warningCalls: async () => calls,
  }
}
