let installed = false
let active = false
let calls = 0

export function nativeCryptoObservation() {
  if (!installed) {
    const decrypt = crypto.subtle.decrypt.bind(crypto.subtle)
    crypto.subtle.decrypt = (...args) => {
      if (active) calls++
      return decrypt(...args)
    }
    installed = true
  }
  return {
    captureDecrypt: async (capture: boolean) => {
      calls = 0
      active = capture
    },
    decryptCalls: async () => calls,
  }
}
