import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

/** Encode the PNG captures without changing any pixel of the mockup. */
export async function encodePictures(
  from: string,
  to: string,
  stems: string[],
): Promise<void> {
  await mkdir(to, { recursive: true })
  let total = 0
  for (const stem of stems) {
    const { size } = await sharp(join(from, `${stem}.png`))
      .webp({ lossless: true, effort: 6 })
      .toFile(join(to, `${stem}.webp`))
    total += size
    console.log(`Encoded ${stem}.webp: ${Math.round(size / 1024)} KB`)
  }
  console.log(`Total: ${Math.round(total / 1024)} KB`)
}
