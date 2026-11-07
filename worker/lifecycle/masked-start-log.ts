/** Only the masker can construct a log that is safe to release. */
export class MaskedStartLog {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static mask(value: string, secrets: readonly string[]): MaskedStartLog {
    let result = value
    for (const secret of [...secrets]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length))
      result = result.replaceAll(secret, '[hidden]')
    return new MaskedStartLog(result)
  }

  get text(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
