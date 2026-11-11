import {
  readShortcutKeyText,
  type ShortcutKeyboard,
  type ShortcutKeyText,
  type ShortcutSystem,
} from './shortcut-key'

const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const keys = (texts: readonly string[]) => texts.map(readShortcutKeyText)

const selection = arrows.map((key) => `Shift+${key}`)
const mac = keys([
  'Meta+Z',
  'Shift+Meta+Z',
  'Meta+X',
  'Meta+C',
  'Meta+V',
  'Meta+A',
  'Alt+Shift+Meta+V',
  'Meta+Backspace',
  'Shift+Meta+Backspace',
  'Alt+Backspace',
  'Alt+Shift+Backspace',
  'Ctrl+Backspace',
  'Meta+Delete',
  'Alt+Delete',
  'Ctrl+H',
  'Ctrl+D',
  'Ctrl+K',
  ...selection,
  ...['Meta', 'Alt', 'Shift+Meta', 'Alt+Shift'].flatMap((modifier) =>
    arrows.map((key) => `${modifier}+${key}`),
  ),
  ...['A', 'E', 'B', 'F', 'N', 'P', 'T', 'O', 'Y', 'V', 'L'].map(
    (key) => `Ctrl+${key}`,
  ),
  ...['A', 'B', 'E', 'F', 'N', 'P', 'V'].map((key) => `Ctrl+Shift+${key}`),
  'Meta+.',
  'Ctrl+Alt+Meta+ArrowLeft',
  'Ctrl+Alt+Meta+ArrowRight',
  'Ctrl+Alt+Meta+ArrowDown',
])

const other = keys([
  'Ctrl+Z',
  'Ctrl+Y',
  'Ctrl+Shift+Z',
  'Ctrl+X',
  'Ctrl+C',
  'Ctrl+V',
  'Ctrl+Shift+V',
  'Ctrl+A',
  'Ctrl+Insert',
  'Shift+Insert',
  'Shift+Delete',
  'Ctrl+Backspace',
  'Ctrl+Delete',
  ...selection,
  ...['Ctrl', 'Ctrl+Shift'].flatMap((modifier) =>
    [...arrows, 'Home', 'End'].map((key) => `${modifier}+${key}`),
  ),
  'Ctrl+.',
])

const windows = keys(['Alt+Backspace', 'Alt+Shift+Backspace'])
const linux = keys([
  'Ctrl+Shift+Backspace',
  'Ctrl+Shift+Delete',
  'Ctrl+/',
  'Ctrl+Shift+U',
])

/** Modified text keys. Windows and Linux contribute to one fixed list. */
export function textShortcutKeys(
  keyboard: ShortcutKeyboard,
  system: ShortcutSystem,
): readonly ShortcutKeyText[] {
  if (keyboard === 'mac') return mac
  if (system === 'windows') return [...other, ...windows]
  if (system === 'linux') return [...other, ...linux]
  return [...other, ...windows, ...linux]
}
