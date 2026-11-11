import { describe, expect, it } from 'vitest'
import type { HttpFetch } from '../env'
import {
  chatGptEgress,
  EGRESS_ORIGIN_HEADER,
  EGRESS_SECRET_HEADER,
} from './egress'

const secret = 'egress-secret-egress-secret-egress-secret'

function recorder() {
  const requests: Request[] = []
  const fetch: HttpFetch = async (request) => {
    requests.push(request)
    return new Response(await request.text(), { status: 200 })
  }
  return { requests, dependencies: { fetch } }
}

describe('chatGptEgress', () => {
  it('sends chatgpt.com requests through the proxy with the secret', async () => {
    const { requests, dependencies } = recorder()
    const egress = chatGptEgress(
      {
        CHATGPT_EGRESS_URL: 'https://egress.example.test',
        CHATGPT_EGRESS_SECRET: secret,
      },
      dependencies,
    )
    const response = await egress.fetch(
      new Request('https://chatgpt.com/backend-api/codex/responses?x=1', {
        method: 'POST',
        headers: { authorization: 'Bearer upstream' },
        body: 'payload',
        redirect: 'manual',
      }),
    )
    expect(await response.text()).toBe('payload')
    const [sent] = requests
    expect(sent.url).toBe(
      'https://egress.example.test/backend-api/codex/responses?x=1',
    )
    expect(sent.method).toBe('POST')
    expect(sent.redirect).toBe('manual')
    expect(sent.headers.get(EGRESS_SECRET_HEADER)).toBe(secret)
    expect(sent.headers.get(EGRESS_ORIGIN_HEADER)).toBe('https://chatgpt.com')
    expect(sent.headers.get('authorization')).toBe('Bearer upstream')
  })

  it('keeps the ChatGPT workspace origin for the proxy', async () => {
    const { requests, dependencies } = recorder()
    const egress = chatGptEgress(
      {
        CHATGPT_EGRESS_URL: 'https://egress.example.test',
        CHATGPT_EGRESS_SECRET: secret,
      },
      dependencies,
    )
    await egress.fetch(new Request('https://eu.chatgpt.com/backend-api/x'))
    expect(requests[0].headers.get(EGRESS_ORIGIN_HEADER)).toBe(
      'https://eu.chatgpt.com',
    )
  })

  it('keeps the direct path for other hosts', async () => {
    const { requests, dependencies } = recorder()
    const egress = chatGptEgress(
      {
        CHATGPT_EGRESS_URL: 'https://egress.example.test',
        CHATGPT_EGRESS_SECRET: secret,
      },
      dependencies,
    )
    await egress.fetch(new Request('https://api.openai.com/v1/responses'))
    await egress.fetch(new Request('https://chatgpt.com.example.test/x'))
    expect(requests.map((request) => request.url)).toEqual([
      'https://api.openai.com/v1/responses',
      'https://chatgpt.com.example.test/x',
    ])
    expect(requests[0].headers.has(EGRESS_SECRET_HEADER)).toBe(false)
  })

  it('changes nothing without a complete https setting', () => {
    const { dependencies } = recorder()
    expect(chatGptEgress({}, dependencies)).toBe(dependencies)
    expect(
      chatGptEgress(
        { CHATGPT_EGRESS_URL: 'https://egress.example.test' },
        dependencies,
      ),
    ).toBe(dependencies)
    expect(
      chatGptEgress(
        {
          CHATGPT_EGRESS_URL: 'http://egress.example.test',
          CHATGPT_EGRESS_SECRET: secret,
        },
        dependencies,
      ),
    ).toBe(dependencies)
  })
})
