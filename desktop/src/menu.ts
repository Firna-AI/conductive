import { Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { productName } from '../../docs/mockups/src/brand.js'

export function installMenu(
  signIn: () => void,
  check: () => void,
  updatesAvailable: boolean,
): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: productName,
      submenu: [
        { role: 'about' },
        { label: 'Sign in with GitHub', click: signIn },
        { type: 'separator' },
        { role: 'services' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Check for updates', enabled: updatesAvailable, click: check },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
