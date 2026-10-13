import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateGemini } from './gemini'
import { AiError } from '../types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

function okResponse(json: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => json,
  } as unknown as Response
}

function errResponse(status: number, json: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => json,
  } as unknown as Response
}

describe('generateGemini', () => {
  it('calls Google Gemini endpoint with correct parameters and returns text & usage', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      okResponse({
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello! I can help you find a 3BHK flat.' }],
              role: 'model',
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 42,
          candidatesTokenCount: 15,
          totalTokenCount: 57,
        },
      }),
    )

    const res = await generateGemini({
      apiKey: 'test-gemini-key',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a real estate assistant',
      messages: [{ role: 'user', content: 'Do you have 3BHK flats?' }],
      timeoutMs: 5000,
    })

    expect(res.text).toBe('Hello! I can help you find a 3BHK flat.')
    expect(res.usage).toEqual({
      promptTokens: 42,
      completionTokens: 15,
      totalTokens: 57,
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    const [callUrl, callOpts] = vi.mocked(fetch).mock.calls[0]
    expect(callUrl).toContain('gemini-2.5-flash:generateContent?key=test-gemini-key')
    const body = JSON.parse(callOpts?.body as string)
    expect(body.system_instruction.parts[0].text).toBe('You are a real estate assistant')
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Do you have 3BHK flats?' }] },
    ])
  })

  it('prepends a user start message if conversation starts with assistant role', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      okResponse({
        candidates: [
          {
            content: {
              parts: [{ text: 'We have units available.' }],
            },
          },
        ],
      }),
    )

    await generateGemini({
      apiKey: 'test-gemini-key',
      model: 'gemini-2.5-flash',
      systemPrompt: '',
      messages: [
        { role: 'assistant', content: 'Welcome to our agency!' },
        { role: 'user', content: 'What are the prices?' },
      ],
      timeoutMs: 5000,
    })

    const [, callOpts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(callOpts?.body as string)
    // First message must be user for Gemini API
    expect(body.contents[0].role).toBe('user')
    expect(body.contents[1].role).toBe('model')
    expect(body.contents[2].role).toBe('user')
  })

  it('throws empty_response if candidates array or text is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      okResponse({
        candidates: [],
      }),
    )

    await expect(
      generateGemini({
        apiKey: 'test-gemini-key',
        model: 'gemini-2.5-flash',
        systemPrompt: '',
        messages: [{ role: 'user', content: 'Hello' }],
        timeoutMs: 5000,
      }),
    ).rejects.toThrowError(AiError)
  })

  it('surfaces invalid_key when Gemini returns error with API key invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      errResponse(400, {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      }),
    )

    const err = await generateGemini({
      apiKey: 'bad-key',
      model: 'gemini-2.5-flash',
      systemPrompt: '',
      messages: [{ role: 'user', content: 'Hello' }],
      timeoutMs: 5000,
    }).catch((e) => e)

    expect(err).toBeInstanceOf(AiError)
    expect(err.code).toBe('invalid_key')
    expect(err.status).toBe(401)
  })
})
