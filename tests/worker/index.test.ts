import { env, exports as workerExports } from 'cloudflare:workers'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://louispaulet.github.io'

interface FetchMockOptions {
  turnstileSuccess?: boolean
  result?: {
    verdict: 'TRUE' | 'FALSE' | 'UNVERIFIABLE'
    reason: string
  }
  articleHtml?: string
}

function installFetchMock({
  turnstileSuccess = true,
  result,
  articleHtml,
}: FetchMockOptions = {}) {
  let groqCalls = 0
  let articleCalls = 0

  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)

      if (
        request.method === 'POST' &&
        url.origin === 'https://challenges.cloudflare.com' &&
        url.pathname === '/turnstile/v0/siteverify'
      ) {
        return Promise.resolve(
          Response.json({
            success: turnstileSuccess,
            action: turnstileSuccess ? 'analyze' : undefined,
            hostname: turnstileSuccess ? 'louispaulet.github.io' : undefined,
          }),
        )
      }

      if (
        request.method === 'GET' &&
        url.origin === 'https://news.example' &&
        url.pathname === '/article' &&
        articleHtml
      ) {
        articleCalls += 1
        return Promise.resolve(
          new Response(articleHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }),
        )
      }

      if (
        request.method === 'POST' &&
        url.origin === 'https://api.groq.com' &&
        url.pathname === '/openai/v1/chat/completions' &&
        result
      ) {
        groqCalls += 1
        return Promise.resolve(
          Response.json({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 0,
            model: 'openai/gpt-oss-20b',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify(result),
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20,
            },
          }),
        )
      }

      return Promise.reject(
        new Error(`No fetch mock for ${request.method} ${url.href}`),
      )
    },
  )

  return {
    get groqCalls() {
      return groqCalls
    },
    get articleCalls() {
      return articleCalls
    },
  }
}

async function analyze(content: string, turnstileToken = 'valid-token') {
  return workerExports.default.fetch(
    new Request('https://worker.test/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
      },
      body: JSON.stringify({ content, turnstileToken }),
    }),
  )
}

describe('debunk-fake-news-api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports health without exposing secret bindings', async () => {
    const response = await workerExports.default.fetch(
      new Request('https://worker.test/health', {
        headers: { Origin: ORIGIN },
      }),
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      status: 'ok',
      model: env.GROQ_MODEL,
    })
    expect(JSON.stringify(body)).not.toContain('test-groq-key')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
  })

  it('verifies Turnstile before returning a structured verdict', async () => {
    const calls = installFetchMock({
      result: {
        verdict: 'TRUE',
        reason: 'Paris is the capital city of France.',
      },
    })

    const response = await analyze('Paris is the capital of France.')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      verdict: 'TRUE',
      reason: 'Paris is the capital city of France.',
    })
    expect(calls.groqCalls).toBe(1)
  })

  it('fails closed when Turnstile rejects the token', async () => {
    const calls = installFetchMock({ turnstileSuccess: false })

    const response = await analyze('A claim to check')
    const body: unknown = await response.json()

    expect(response.status).toBe(403)
    expect(body).toMatchObject({
      error: { code: 'BOT_VERIFICATION_FAILED' },
    })
    expect(calls.groqCalls).toBe(0)
  })

  it('rejects private URLs after verification and before article fetching', async () => {
    const calls = installFetchMock()

    const response = await analyze('http://127.0.0.1/private')
    const body: unknown = await response.json()

    expect(response.status).toBe(422)
    expect(body).toMatchObject({
      error: { code: 'URL_NOT_ALLOWED' },
    })
    expect(calls.articleCalls).toBe(0)
    expect(calls.groqCalls).toBe(0)
  })

  it('extracts a bounded public article before asking Groq', async () => {
    const calls = installFetchMock({
      articleHtml:
        '<html><head><title>City update</title></head><body><main><h1>Bridge opens</h1><p>The new bridge opened on Monday after safety inspections.</p></main></body></html>',
      result: {
        verdict: 'UNVERIFIABLE',
        reason:
          'The supplied article alone does not independently establish the claim.',
      },
    })

    const response = await analyze('https://news.example/article')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      verdict: 'UNVERIFIABLE',
      reason:
        'The supplied article alone does not independently establish the claim.',
    })
    expect(calls.articleCalls).toBe(1)
    expect(calls.groqCalls).toBe(1)
  })

  it('rejects browser origins outside the production allowlist', async () => {
    const response = await workerExports.default.fetch(
      new Request('https://worker.test/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://attacker.example',
        },
        body: JSON.stringify({
          content: 'A claim',
          turnstileToken: 'valid-token',
        }),
      }),
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
