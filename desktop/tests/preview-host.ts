import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'

/** Compose production window, policy, popup, cookie and native-navigation owners. */
export async function previewHost(
  directory: string,
  input: { appOrigin: string; frames: string[]; launcher: string },
) {
  const desktop = resolve(import.meta.dirname, '..')
  const repository = resolve(desktop, '..')
  const web = resolve(directory, 'web')
  await build({
    root: repository,
    configFile: false,
    publicDir: false,
    logLevel: 'silent',
    build: {
      outDir: resolve(web, 'desktop/renderer'),
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: resolve(desktop, 'renderer/navigation.ts'),
        formats: ['es'],
        fileName: () => 'navigation.js',
      },
    },
  })
  await writeFile(
    resolve(web, 'index.html'),
    `<!doctype html><h1>Preview fixture</h1><p role="status">Starting.</p><a href="${input.launcher}" target="_blank">Open in new tab</a><iframe title="Port preview" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" src="${input.launcher}"></iframe><script type="module" src="/ready.js"></script>`,
  )
  await writeFile(
    resolve(web, 'ready.js'),
    `import {installAppPopups} from './desktop/renderer/navigation.js';installAppPopups(${JSON.stringify(input.appOrigin)});document.querySelector('[role=status]').textContent='Ready.'`,
  )
  const moduleUrl = (name: string) =>
    pathToFileURL(resolve(desktop, 'dist/app', name)).href
  const source = `
import {app,BrowserWindow,protocol,session} from 'electron';
import {readFile,realpath,stat} from 'node:fs/promises';
import {createWindow} from ${JSON.stringify(moduleUrl('desktop/src/window.js'))};
import {registerScheme,exportHandler} from ${JSON.stringify(moduleUrl('desktop/src/export-handler.js'))};
import {contentSecurityPolicy} from ${JSON.stringify(moduleUrl('desktop/src/config.js'))};
import {installNavigation} from ${JSON.stringify(moduleUrl('desktop/src/navigation.js'))};
import {installPermissions} from ${JSON.stringify(moduleUrl('desktop/src/permissions.js'))};
import {openPreviewInBrowser} from ${JSON.stringify(moduleUrl('desktop/src/preview.js'))};
const configuration=${JSON.stringify(input)};
registerScheme(protocol);
app.setPath('userData',${JSON.stringify(directory)});
void app.whenReady().then(async()=>{
const jar=session.fromPartition('persist:conductive');
installPermissions(jar);
jar.protocol.handle('conductive-app',exportHandler({read:readFile,realpath,stat},${JSON.stringify(web)},contentSecurityPolicy({appOrigin:configuration.appOrigin,frameSources:configuration.frames,updates:'unpublished'})));
await jar.cookies.set({url:configuration.appOrigin,name:'__Host-conductive-desktop-session',value:'mac-session',secure:true,httpOnly:true,sameSite:'no_restriction',expirationDate:Date.now()/1000+3600});
const window=createWindow({create:options=>new BrowserWindow(options),readState:()=>'',saveState:()=>{},visible:()=>true,warn:()=>{}});
const external=async url=>{process.env.CONDUCTIVE_TEST_PREVIEW_EXTERNAL=url};
installNavigation(window.webContents,configuration.appOrigin,{load:url=>window.loadURL(url),external,signIn:async()=>{},preview:url=>openPreviewInBrowser(url,{appOrigin:configuration.appOrigin,frameSources:configuration.frames,fetch:request=>jar.fetch(request),external}),warn:error=>{process.env.CONDUCTIVE_TEST_PREVIEW_ERROR=String(error?.message??'failed')}});
await window.loadURL('${DESKTOP_ORIGIN}/');
app.on('window-all-closed',()=>app.quit());
}).catch(error=>{process.stderr.write(String(error));app.quit()});
`
  const file = resolve(directory, 'host.mjs')
  await writeFile(file, source)
  return file
}
