import { readFile, writeFile } from 'node:fs/promises'
import { paths } from '../../docs/mockups/src/paths.ts'
import type { Page, Viewport } from './page.ts'
import { previewDocument } from './preview-document.ts'

type PreviewOptions = {
  origin: string
  path: string
  openPage: (
    viewport: Viewport,
    deviceScaleFactor?: number,
  ) => Promise<Pick<Page, 'goto' | 'setContent' | 'screenshot' | 'close'>>
  readAsset?: (path: URL) => Promise<Buffer>
  writePicture?: (path: string, picture: Buffer) => Promise<void>
}

export async function capturePreview({
  origin,
  path,
  openPage,
  readAsset = readFile,
  writePicture = writeFile,
}: PreviewOptions): Promise<void> {
  const workspaceSize = { width: 1440, height: 547 }
  const workspace = await openPage({ ...workspaceSize, mobile: false }, 2)
  let workspacePicture: Buffer
  try {
    await workspace.goto(
      `${origin}/static/mokly-generated/${paths.app}/index.desktop.dark.html`,
    )
    workspacePicture = await workspace.screenshot({
      x: 0,
      y: 0,
      ...workspaceSize,
    })
  } finally {
    await workspace.close()
  }

  const [background, lockup, font] = await Promise.all([
    readAsset(new URL('./assets/link-preview-background.png', import.meta.url)),
    readAsset(
      new URL('../../docs/brand/conductive-lockup-light.svg', import.meta.url),
    ),
    readAsset(
      new URL(
        '../../docs/mockups/src/fonts/InterVariable.woff2',
        import.meta.url,
      ),
    ),
  ])
  const html = previewDocument({
    background,
    lockup,
    font,
    workspace: workspacePicture,
  })
  const previewSize = { width: 1200, height: 630 }
  const composition = await openPage({ ...previewSize, mobile: false }, 1)
  try {
    await composition.setContent(html)
    await writePicture(
      path,
      await composition.screenshot({ x: 0, y: 0, ...previewSize }),
    )
  } finally {
    await composition.close()
  }
}
