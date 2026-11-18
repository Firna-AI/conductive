import { expect, it } from 'vitest'

import { outboundRequest } from './outbound-request'

it('uses manual redirects and the product User-Agent for outside API requests', () => {
  const request = outboundRequest('https://api.example.com/resource')

  expect({
    redirect: request.redirect,
    userAgent: request.headers.get('User-Agent'),
  }).toEqual({
    redirect: 'manual',
    userAgent: 'Conductive',
  })
})
