const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

export const analyzeEndpoint = `${configuredApiUrl || ''}/api/analyze`
export const turnstileSitekey =
  import.meta.env.VITE_TURNSTILE_SITEKEY?.trim() ?? ''
