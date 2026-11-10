import type { Client, Transport } from '@sentry/core'
import {
  captureException,
  defaultStackParser,
  getClient,
  getCurrentScope,
  globalHandlersIntegration,
  init,
  type makeFetchTransport,
} from '@sentry/react'
import type { RootOptions } from 'react-dom/client'

import type { Navigation } from './navigation'
import {
  BROWSER_ERROR_TRACKING_DSN,
  ERROR_TRACKING_RELEASE,
  errorTrackingDsnOrigin,
} from '../shared/error-reporting'
import { createBrowserErrorPolicy } from './error-reporting-policy'
import {
  browserRuntimeContext,
  browserScreen,
  browserStackFormat,
} from './error-reporting-runtime'

export interface BrowserErrorReporting {
  rootOptions: RootOptions | undefined
  identity: { setUser(userId: string | null): void }
  close(): Promise<boolean>
}

interface BrowserErrorBuild {
  production: boolean
  dsn: string
  release?: string
}

export type BrowserTransportFactory = (
  options: Parameters<typeof makeFetchTransport>[0],
) => Transport

export type BrowserErrorOptions = {
  target: {
    location: Pick<Location, 'origin'>
    navigator: Pick<Navigator, 'userAgent'>
  }
  navigation: Navigation
  build?: BrowserErrorBuild
  transport?: BrowserTransportFactory
  now?: () => number
  createProbeError?: (message: string) => Error
} & ({ platform: 'web' } | { platform: 'mac'; appOrigin: string })

export function startBrowserErrorReporting(
  options: BrowserErrorOptions,
): BrowserErrorReporting {
  let client: Client | undefined
  let active = false
  let stop: (() => void) | undefined
  let userId: string | null = null
  const disabled: BrowserErrorReporting = {
    rootOptions: undefined,
    identity: { setUser: () => undefined },
    close: async () => true,
  }
  const close = async (): Promise<boolean> => {
    active = false
    userId = null
    if (client && getClient() === client) getCurrentScope().setClient(undefined)
    try {
      stop?.()
      return (await client?.close()) ?? true
    } catch {
      return false
    }
  }
  try {
    const build = options.build ?? {
      production: import.meta.env.PROD,
      dsn: BROWSER_ERROR_TRACKING_DSN,
      release: ERROR_TRACKING_RELEASE,
    }
    const origin =
      options.platform === 'mac'
        ? options.appOrigin
        : options.target.location.origin
    const release = build.release
    if (
      !build.production ||
      !release ||
      !/^conductive@(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(release) ||
      !errorTrackingDsnOrigin(build.dsn) ||
      origin !== 'https://app.conductive.build'
    )
      return disabled
    let screen = browserScreen(options.navigation)
    const runtime = browserRuntimeContext(options.target.navigator.userAgent)
    const format = browserStackFormat(
      options.createProbeError ?? ((message) => new Error(message)),
    )
    const policy = createBrowserErrorPolicy({
      context: () => ({
        timestamp: (options.now ?? Date.now)() / 1000,
        release,
        platform: options.platform,
        screen,
        runtime,
        userId,
      }),
      bundleOrigin:
        options.platform === 'mac' ? 'conductive-app://desktop' : origin,
      format,
      active: () => active,
      transport: options.transport,
    })
    client = init({
      dsn: build.dsn,
      release,
      environment: 'production',
      debug: false,
      defaultIntegrations: false,
      integrations: [
        globalHandlersIntegration({
          onerror: true,
          onunhandledrejection: true,
        }),
      ],
      stackParser: defaultStackParser,
      attachStacktrace: false,
      sendClientReports: false,
      maxBreadcrumbs: 0,
      beforeBreadcrumb: () => null,
      beforeSendLog: () => null,
      beforeSendMetric: () => null,
      beforeSendTransaction: () => null,
      tracePropagationTargets: [],
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      profileSessionSampleRate: 0,
      spotlight: false,
      enhanceFetchErrorMessages: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        mcp: { inputs: false, outputs: false },
        databaseQueryData: false,
        queues: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
      beforeSend: policy.beforeSend,
      transport: policy.transport,
    })
    if (!client || client.getOptions().enabled === false) {
      void close()
      return disabled
    }
    stop = options.navigation.subscribe(() => {
      screen = browserScreen(options.navigation)
    })
    active = true
    const report = (
      kind: 'uncaught' | 'caught' | 'recoverable',
      error: unknown,
    ) => {
      try {
        if (active)
          captureException(error, {
            mechanism: {
              type: `conductive.react.${kind}`,
              handled: kind !== 'uncaught',
            },
          })
      } catch {
        // Reporting never changes React's result.
      }
    }
    return {
      rootOptions: {
        onUncaughtError: (error) => report('uncaught', error),
        onCaughtError: (error) => report('caught', error),
        onRecoverableError: (error) => report('recoverable', error),
      },
      identity: {
        setUser: (id) => {
          if (active) userId = id
        },
      },
      close,
    }
  } catch {
    void close()
    return disabled
  }
}
