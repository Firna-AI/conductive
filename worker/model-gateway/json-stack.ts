const states = [
  'object-key-or-end',
  'object-key',
  'colon',
  'object-value',
  'object-comma-or-end',
  'array-value-or-end',
  'array-value',
  'array-comma-or-end',
] as const
type State = (typeof states)[number]
const PAGE_BYTES = 4096
const PAGE_FRAMES = PAGE_BYTES * 2

/** Two container states per byte, with no depth limit beyond the body budget. */
export class JsonStack {
  private readonly pages: Uint8Array[] = []
  private depth = 0

  get length(): number {
    return this.depth
  }

  get top(): State | undefined {
    if (this.depth === 0) return undefined
    const index = this.depth - 1
    const page = this.pages[Math.floor(index / PAGE_FRAMES)]
    const byte = page[Math.floor((index % PAGE_FRAMES) / 2)]
    return states[(byte >> ((index % 2) * 4)) & 15]
  }

  set top(state: State) {
    const index = this.depth - 1
    const page = this.pages[Math.floor(index / PAGE_FRAMES)]
    const byteIndex = Math.floor((index % PAGE_FRAMES) / 2)
    const shift = (index % 2) * 4
    page[byteIndex] =
      (page[byteIndex] & ~(15 << shift)) | (states.indexOf(state) << shift)
  }

  push(state: State): void {
    if (this.depth % PAGE_FRAMES === 0)
      this.pages.push(new Uint8Array(PAGE_BYTES))
    this.depth++
    this.top = state
  }

  pop(): void {
    this.depth--
    if (this.depth % PAGE_FRAMES === 0) this.pages.pop()
  }
}
