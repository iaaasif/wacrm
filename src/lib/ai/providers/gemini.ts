import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'
import { getT } from '@/lib/i18n/translate'

const t = getT('LibErrors')

interface GeminiPart {
  text?: string
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: GeminiPart[]
      role?: string
    }
    finishReason?: string
  }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

/**
 * Call Google Gemini's native generateContent endpoint with the caller's key.
 * Supports gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, etc.
 * Normalizes system instruction, alternating roles, and usage metrics.
 */
export async function generateGemini(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  const merged = mergeConsecutive(messages)
  // Gemini requires the first turn in contents to be from the 'user'.
  const normalized =
    merged[0]?.role === 'assistant'
      ? [{ role: 'user' as const, content: '[Conversation start]' }, ...merged]
      : merged

  const contents: GeminiContent[] = (
    normalized.length > 0 ? normalized : [{ role: 'user' as const, content: 'Hello' }]
  ).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const systemInstruction = systemPrompt.trim()
    ? { parts: [{ text: systemPrompt }] }
    : undefined

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
        contents,
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Google Gemini', res)
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AiError(t('ai.emptyResponse', { provider: 'Google Gemini' }), {
      code: 'empty_response',
    })
  }

  const usage = normalizeUsage({
    prompt: data?.usageMetadata?.promptTokenCount,
    completion: data?.usageMetadata?.candidatesTokenCount,
    total: data?.usageMetadata?.totalTokenCount,
  })

  return { text, usage }
}
