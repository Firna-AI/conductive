import environmentSource from './environment.py?raw'
import {
  PREVIEW_INGRESS_PATH,
  type PreviewIngressIdentity,
} from '../../../src/shared/preview-ingress'
import { shellArgument } from '../../terminal/privileged'
import { ResponseBudget } from './budgets'
import type { E2bContext } from './context'
import { envdSession } from './envd'
import { executePython } from './process'
import { uploadFile } from './files'

export async function writeEnvironment(
  context: E2bContext,
  sandboxId: string,
  env: Record<string, string>,
): Promise<void> {
  const session = await envdSession(context, sandboxId)
  const temporary = `/run/ascii-secrets/.env-${crypto.randomUUID()}`
  const ingress: PreviewIngressIdentity = {
    sandboxId,
    domain: context.domain,
    aliases: {},
  }
  const config = { temporary, ingressPath: PREVIEW_INGRESS_PATH, ingress }
  const budget = new ResponseBudget('command')
  try {
    await executePython(
      session,
      environmentSource,
      { ...config, kind: 'environment_prepare' },
      budget,
      30,
    )
    const content = Object.entries(env)
      .map(([name, value]) => `export ${shellArgument(`${name}=${value}`)}\n`)
      .join('')
    const bytes = new TextEncoder().encode(content)
    await uploadFile(
      session,
      temporary,
      new Blob([bytes]).stream(),
      bytes.byteLength,
    )
    await executePython(
      session,
      environmentSource,
      { ...config, kind: 'environment_commit' },
      budget,
      30,
    )
  } catch (error) {
    await executePython(
      session,
      environmentSource,
      { ...config, kind: 'environment_cleanup' },
      new ResponseBudget('command'),
      30,
    ).catch(() => undefined)
    throw error
  }
}

export async function registerIngressAlias(
  context: E2bContext,
  sandboxId: string,
  targetPort: number,
  aliasPort: number,
): Promise<void> {
  const ingress: PreviewIngressIdentity = {
    sandboxId,
    domain: context.domain,
    aliases: { [String(targetPort)]: aliasPort },
  }
  await executePython(
    await envdSession(context, sandboxId),
    environmentSource,
    { kind: 'preview_ingress', ingressPath: PREVIEW_INGRESS_PATH, ingress },
    new ResponseBudget('command'),
    10,
  )
}
