/** Only the masker can construct a log that is safe to release. */
export class MaskedStartLog {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static mask(value: string, secrets: readonly string[]): MaskedStartLog {
    const ordered = [...secrets]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
    let result = ''
    let index = 0
    while (index < value.length) {
      const secret = ordered.find((entry) => value.startsWith(entry, index))
      if (secret) {
        result += '[hidden]'
        index += secret.length
      } else result += value[index++]
    }
    return new MaskedStartLog(result)
  }

  get text(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
