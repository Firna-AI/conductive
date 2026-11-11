export type ImageKind = 'png' | 'jpeg' | 'gif' | 'webp'

const checkedImage = Symbol('checked image')

export interface CheckedImage {
  readonly kind: ImageKind
  readonly bytes: Uint8Array
  readonly [checkedImage]: true
}

export function readImage(bytes: Uint8Array): CheckedImage | null {
  let kind: ImageKind | null = null
  if (matches(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) kind = 'png'
  else if (matches(bytes, [255, 216, 255])) kind = 'jpeg'
  else if (
    matches(bytes, [71, 73, 70, 56, 55, 97]) ||
    matches(bytes, [71, 73, 70, 56, 57, 97])
  )
    kind = 'gif'
  else if (
    matches(bytes, [82, 73, 70, 70]) &&
    matches(bytes, [87, 69, 66, 80], 8)
  )
    kind = 'webp'
  return kind ? { kind, bytes, [checkedImage]: true } : null
}

function matches(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}
