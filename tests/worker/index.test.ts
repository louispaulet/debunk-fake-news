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
  youtubeTranscript?: string[]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function installFetchMock({
  turnstileSuccess = true,
  result,
  articleHtml,
  youtubeTranscript,
}: FetchMockOptions = {}) {
  let groqCalls = 0
  let articleCalls = 0
  let youtubePlayerCalls = 0
  let youtubeTranscriptCalls = 0
  let lastGroqPrompt: string | null = null
  const events: string[] = []

  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)

      if (
        request.method === 'POST' &&
        url.origin === 'https://challenges.cloudflare.com' &&
        url.pathname === '/turnstile/v0/siteverify'
      ) {
        events.push('turnstile')
        return Response.json({
          success: turnstileSuccess,
          action: turnstileSuccess ? 'analyze' : undefined,
          hostname: turnstileSuccess ? 'louispaulet.github.io' : undefined,
        })
      }

      if (
        request.method === 'GET' &&
        url.origin === 'https://news.example' &&
        url.pathname === '/article' &&
        articleHtml
      ) {
        articleCalls += 1
        events.push('article')
        return new Response(articleHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }

      if (
        request.method === 'POST' &&
        url.origin === 'https://www.youtube.com' &&
        url.pathname === '/youtubei/v1/player' &&
        youtubeTranscript
      ) {
        youtubePlayerCalls += 1
        events.push('youtube-player')
        return Response.json({
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [
                {
                  baseUrl:
                    'https://www.youtube.com/api/timedtext?v=_neA7v3ulPU',
                  languageCode: 'fr',
                },
              ],
            },
          },
        })
      }

      if (
        request.method === 'GET' &&
        url.origin === 'https://www.youtube.com' &&
        url.pathname === '/api/timedtext' &&
        youtubeTranscript
      ) {
        youtubeTranscriptCalls += 1
        events.push('youtube-transcript')
        const transcriptXml = youtubeTranscript
          .map(
            (text, index) =>
              `<text start="${index}" dur="1">${escapeXml(text)}</text>`,
          )
          .join('')
        return new Response(`<transcript>${transcriptXml}</transcript>`, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        })
      }

      if (
        request.method === 'POST' &&
        url.origin === 'https://api.groq.com' &&
        url.pathname === '/openai/v1/chat/completions' &&
        result
      ) {
        groqCalls += 1
        events.push('groq')
        const payload: unknown = await request.json()
        if (payload && typeof payload === 'object') {
          const messages = (payload as Record<string, unknown>).messages
          if (Array.isArray(messages)) {
            const userMessage: unknown = (messages as unknown[]).find(
              (message) =>
                message &&
                typeof message === 'object' &&
                (message as Record<string, unknown>).role === 'user',
            )
            if (userMessage && typeof userMessage === 'object') {
              const content = (userMessage as Record<string, unknown>).content
              lastGroqPrompt = typeof content === 'string' ? content : null
            }
          }
        }

        return Response.json({
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
        })
      }

      throw new Error(`No fetch mock for ${request.method} ${url.href}`)
    },
  )

  return {
    get groqCalls() {
      return groqCalls
    },
    get articleCalls() {
      return articleCalls
    },
    get youtubePlayerCalls() {
      return youtubePlayerCalls
    },
    get youtubeTranscriptCalls() {
      return youtubeTranscriptCalls
    },
    get lastGroqPrompt() {
      return lastGroqPrompt
    },
    events,
  }
}

async function analyze(
  content: string,
  turnstileToken = 'valid-token',
  youtubeVideoId?: string,
) {
  return workerExports.default.fetch(
    new Request('https://worker.test/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
      },
      body: JSON.stringify({
        content,
        turnstileToken,
        ...(youtubeVideoId ? { youtubeVideoId } : {}),
      }),
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

  it('randomly samples a long article instead of keeping only its beginning', async () => {
    const longArticle = Array.from(
      { length: 120 },
      (_, index) =>
        `Article section ${index}. ${'Supporting article detail. '.repeat(14)}`,
    ).join(' ')
    const calls = installFetchMock({
      articleHtml: `<html><body><article><p>${longArticle}</p></article></body></html>`,
      result: {
        verdict: 'UNVERIFIABLE',
        reason: 'The sampled article does not provide enough independent evidence.',
      },
    })

    const response = await analyze('https://news.example/article')

    expect(response.status).toBe(200)
    const prompt = calls.lastGroqPrompt
    expect(prompt).toContain('[Random sample from')
    const material = prompt?.match(
      /<untrusted_material>\n\n([\s\S]*?)\n\n<\/untrusted_material>/,
    )?.[1]
    expect(material?.length).toBeLessThanOrEqual(20_000)
  })

  it('retrieves and samples the supplied pyramid-video transcript before asking Groq', async () => {
    const youtubeTranscript = Array.from(
      { length: 100 },
      (_, index) =>
        `Transcript segment ${index} discusses extraordinary theories about how the Egyptian pyramids were constructed. ${'Claim detail. '.repeat(20)}`,
    )
    const calls = installFetchMock({
      youtubeTranscript,
      result: {
        verdict: 'FALSE',
        reason:
          'The video thesis conflicts with archaeological and engineering evidence.',
      },
    })

    const response = await analyze(
      'https://www.youtube.com/watch?v=_neA7v3ulPU',
      'valid-token',
      '_neA7v3ulPU',
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      verdict: 'FALSE',
      reason:
        'The video thesis conflicts with archaeological and engineering evidence.',
    })
    expect(calls.youtubePlayerCalls).toBe(1)
    expect(calls.youtubeTranscriptCalls).toBe(1)
    expect(calls.articleCalls).toBe(0)
    expect(calls.groqCalls).toBe(1)
    expect(calls.events).toEqual([
      'turnstile',
      'youtube-player',
      'youtube-transcript',
      'groq',
    ])
    expect(calls.lastGroqPrompt).toContain(
      'https://www.youtube.com/watch?v=_neA7v3ulPU',
    )
    expect(calls.lastGroqPrompt).toContain('caption transcript')
    expect(calls.lastGroqPrompt).toContain('[Random sample from')
  })

  it('rejects a mismatched YouTube URL and video ID without external analysis', async () => {
    const calls = installFetchMock()

    const response = await analyze(
      'https://www.youtube.com/watch?v=_neA7v3ulPU',
      'valid-token',
      'dQw4w9WgXcQ',
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_YOUTUBE_VIDEO' },
    })
    expect(calls.youtubePlayerCalls).toBe(0)
    expect(calls.youtubeTranscriptCalls).toBe(0)
    expect(calls.groqCalls).toBe(0)
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
