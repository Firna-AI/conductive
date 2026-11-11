import { resolve } from 'node:path'
import {
  sentryVitePlugin,
  type SentryVitePluginOptions,
} from '@sentry/vite-plugin'
import type { Plugin } from 'vite'
import { removeSourceMaps } from './source-map-cleanup.ts'
import {
  readSourceMapUploadSettings,
  runSourceMapUpload,
  type SourceMapUploadSettings,
} from './source-map-upload.ts'

export interface ErrorReportingBuildOptions {
  release: string | undefined
  settings: NodeJS.ProcessEnv
}

const releaseOptions = (release: string | undefined) => ({
  name: release ?? '',
  inject: false,
  create: false,
  finalize: false,
  setCommits: false as const,
  deploy: false as const,
})

export function instrumentErrorReporting(
  release: string | undefined,
  warn: (message: string) => void = console.warn,
): Plugin[] {
  try {
    process.env.SENTRY_CLI_NO_TELEMETRY = '1'
    // Keep these transforms identical in CI and in the operator's upload build.
    return sentryVitePlugin({
      authToken: '',
      org: '',
      project: '',
      telemetry: false,
      silent: true,
      release: { ...releaseOptions(release), inject: true },
      sourcemaps: { disable: 'disable-upload' },
    })
  } catch {
    warn(
      'Error-reporting bundle instrumentation is unavailable. The build will continue.',
    )
    return []
  }
}

function recoverUpload(
  plugin: Plugin,
  warn: (message: string) => void,
): Plugin {
  const writeBundle = plugin.writeBundle
  if (!writeBundle) return plugin
  return {
    ...plugin,
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler(output, bundle) {
        process.env.SENTRY_CLI_NO_TELEMETRY = '1'
        await runSourceMapUpload(async () => {
          const handler =
            typeof writeBundle === 'function'
              ? writeBundle
              : writeBundle.handler
          await handler.call(this, output, bundle)
        }, warn)
      },
    },
  }
}

function uploadPlugins(
  release: string,
  settings: SourceMapUploadSettings,
  directory: string,
  worker: boolean,
  warn: (message: string) => void,
): Plugin[] {
  const options: SentryVitePluginOptions = {
    authToken: settings.authToken,
    url: settings.url,
    org: settings.org,
    project: worker ? settings.workerProject : settings.browserProject,
    telemetry: false,
    silent: true,
    errorHandler: () => {
      warn('Error-reporting source map upload failed. The build will continue.')
    },
    release: {
      ...releaseOptions(release),
      create: true,
      finalize: true,
      ...(worker
        ? {
            uploadLegacySourcemaps: {
              paths: [directory],
              ext: ['js', 'map'],
              urlPrefix: '~/',
            },
          }
        : {}),
    },
    sourcemaps: {
      disable: worker,
      assets: `${directory}/**/*.{js,map}`,
      filesToDeleteAfterUpload: `${directory}/**/*.map`,
    },
  }
  try {
    process.env.SENTRY_CLI_NO_TELEMETRY = '1'
    const plugins: Plugin[] = sentryVitePlugin(options)
    return plugins.map((plugin) => recoverUpload(plugin, warn))
  } catch {
    warn(
      'Error-reporting source map upload is unavailable. The build will continue.',
    )
    return []
  }
}

export function errorReportingBuild({
  release,
  settings,
}: ErrorReportingBuildOptions): Plugin {
  // Capture the shell settings before the SDK can read its own optional env file.
  const uploadSettings = readSourceMapUploadSettings(release, settings)
  const environments = new Map<string, Plugin[]>()
  return {
    name: 'conductive-error-reporting-build',
    apply: 'build',
    enforce: 'post',
    sharedDuringBuild: true,
    applyToEnvironment(environment) {
      if (environment.name !== 'client' && environment.name !== 'conductive')
        return false
      const existing = environments.get(environment.name)
      if (existing) return existing
      const label = environment.name === 'conductive' ? 'Worker' : 'Browser'
      const warn = (message: string) =>
        environment.logger.warn(`[${label} source maps] ${message}`)
      const directory = resolve(
        environment.config.root,
        environment.config.build.outDir,
      )
      const plugins = instrumentErrorReporting(release, warn)
      if (release && uploadSettings && plugins.length) {
        plugins.push(
          ...uploadPlugins(
            release,
            uploadSettings,
            directory,
            environment.name === 'conductive',
            warn,
          ),
        )
      } else {
        warn(
          'Source map upload skipped. A Git release and all five SENTRY upload settings are required.',
        )
      }
      plugins.push({
        name: 'conductive-remove-private-source-maps',
        closeBundle: {
          order: 'post',
          handler: () => removeSourceMaps(directory, warn),
        },
      })
      environments.set(environment.name, plugins)
      return plugins
    },
  }
}
