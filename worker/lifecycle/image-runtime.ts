import { shellQuote } from './commands'

const version = '24.22.2'
const archive = `node-v${version}-linux-x64`
const runtimeRoot = '/opt/conducting/runtime'

export const IMAGE_NODE_RUNTIME = {
  version,
  url: `https://nodejs.org/dist/v${version}/${archive}.tar.gz`,
  sha256: '361718c444e49af2ca5a110c83ba6a8901143f23ab285ebbef0341f391f482a9',
  directory: `${runtimeRoot}/${archive}`,
} as const

export function imageNodeExecutable(root = '/'): string {
  return `${root.replace(/\/+$/, '')}${IMAGE_NODE_RUNTIME.directory}/bin/node`
}

export function imageRuntimeScript(source: string, root = '/'): string {
  return source.replaceAll(
    '@CONDUCTING_NODE@',
    shellQuote(imageNodeExecutable(root)),
  )
}
