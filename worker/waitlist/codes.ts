const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

export function randomAccessCode(): string {
  let code = ''
  const ceiling = 256 - (256 % CODE_ALPHABET.length)
  while (code.length < 10) {
    for (const value of crypto.getRandomValues(new Uint8Array(16))) {
      if (value < ceiling) code += CODE_ALPHABET[value % CODE_ALPHABET.length]
      if (code.length === 10) break
    }
  }
  return code
}

export function normalizeAccessCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^(.{5})-(.{5})$/, '$1$2')
}

export function displayAccessCode(code: string): string {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code
}
