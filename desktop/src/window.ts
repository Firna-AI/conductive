import type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Rectangle,
} from 'electron'
import { productName } from '../../docs/mockups/src/brand.js'

export const BAR_HEIGHT = 34
export const TRAFFIC_LIGHT_POSITION = { x: 14, y: (BAR_HEIGHT - 12) / 2 }

export interface WindowDependencies {
  create(options: BrowserWindowConstructorOptions): BrowserWindow
  readState(): string
  saveState(value: string): void
  visible(bounds: Rectangle): boolean
  warn(error: unknown): void
}

export function windowBounds(
  dependencies: Pick<WindowDependencies, 'readState' | 'visible'>,
): Rectangle | { width: number; height: number } {
  try {
    const value: unknown = JSON.parse(dependencies.readState())
    if (
      typeof value !== 'object' ||
      value === null ||
      !('x' in value) ||
      !('y' in value) ||
      !('width' in value) ||
      !('height' in value)
    )
      throw new Error('Invalid bounds')
    const { x, y, width, height } = value
    if (
      typeof x === 'number' &&
      typeof y === 'number' &&
      typeof width === 'number' &&
      typeof height === 'number' &&
      [x, y, width, height].every(Number.isSafeInteger) &&
      width >= 640 &&
      height >= 480
    ) {
      const bounds = { x, y, width, height }
      if (dependencies.visible(bounds)) return bounds
    }
  } catch {
    /* The first launch has no saved window. */
  }
  return { width: 1296, height: 812 }
}

export function createWindow(dependencies: WindowDependencies): BrowserWindow {
  const active = dependencies.create({
    ...windowBounds(dependencies),
    minWidth: 640,
    minHeight: 480,
    title: productName,
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'darwin' ? { height: BAR_HEIGHT } : false,
    trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    backgroundColor: '#0b0c0e',
    webPreferences: {
      partition: 'persist:conductive',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  })
  active.on('close', () => {
    try {
      dependencies.saveState(JSON.stringify(active.getNormalBounds()))
    } catch (error) {
      dependencies.warn(error)
    }
  })
  return active
}
