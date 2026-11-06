import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http'
import type { ElectronApplication } from '@playwright/test'

import { API_PATHS } from '../../src/shared/api.ts'
import { deviceConnectionPath } from '../../src/shared/device.ts'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'

/** Redirect only the device upgrade to this test's real, isolated relay. */
export async function installDeviceNetwork(
  electron: ElectronApplication,
  appOrigin: string,
  port: number,
): Promise<void> {
  await electron.evaluate(
    (_electron, input) => {
      const https = process.getBuiltinModule('node:https')
      const http = process.getBuiltinModule('node:http')
      const original = https.request
      function request(
        resource: string | URL | RequestOptions,
        options?: RequestOptions | ((response: IncomingMessage) => void),
        callback?: (response: IncomingMessage) => void,
      ): ClientRequest {
        const settings = typeof options === 'object' ? options : {}
        const listener = typeof options === 'function' ? options : callback
        if (typeof resource === 'object' && !(resource instanceof URL)) {
          if (
            (resource.hostname ?? resource.host) ===
              new URL(input.appOrigin).hostname &&
            resource.path?.startsWith(input.connectionPrefix)
          ) {
            const redirected = {
              ...resource,
              protocol: 'http:',
              host: '127.0.0.1',
              hostname: '127.0.0.1',
              port: input.port,
              agent: http.globalAgent,
              createConnection: undefined,
            }
            Reflect.deleteProperty(redirected, '_defaultAgent')
            Reflect.deleteProperty(redirected, 'defaultPort')
            return http.request(redirected, listener)
          }
          return original({ ...resource, ...settings }, listener)
        }
        return original(resource, settings, listener)
      }
      https.request = request
      const fetchOriginal = globalThis.fetch
      globalThis.fetch = async (resource, options) => {
        const request =
          resource instanceof Request
            ? resource
            : new Request(resource, options)
        if (request.url !== input.appOrigin + input.sessionPath)
          return fetchOriginal(resource, options)
        if (
          request.headers.get('Origin') !== input.desktopOrigin ||
          request.headers.get('Cookie') !==
            `${input.cookieName}=session.signature`
        )
          return new Response(null, { status: 401 })
        return Response.json({ user: { id: 'user-one' } })
      }
    },
    {
      appOrigin,
      port,
      connectionPrefix: deviceConnectionPath('').split('?')[0],
      sessionPath: API_PATHS.session,
      desktopOrigin: DESKTOP_ORIGIN,
      cookieName: DESKTOP_SESSION_COOKIE,
    },
  )
}
