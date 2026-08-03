const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
])

const YOUTUBE_SHORT_HOSTNAMES = new Set(['youtu.be', 'www.youtu.be'])

function validVideoId(value: string | null | undefined): string | null {
  return value && YOUTUBE_VIDEO_ID_PATTERN.test(value) ? value : null
}

export function youtubeVideoIdFromUrl(value: string): string | null {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    return null
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  const pathSegments = url.pathname.split('/').filter(Boolean)

  if (YOUTUBE_SHORT_HOSTNAMES.has(hostname)) {
    return validVideoId(pathSegments[0])
  }

  if (!YOUTUBE_HOSTNAMES.has(hostname)) {
    return null
  }

  if (url.pathname === '/watch' || url.pathname === '/watch/') {
    return validVideoId(url.searchParams.get('v'))
  }

  if (
    pathSegments.length >= 2 &&
    ['embed', 'live', 'shorts', 'v'].includes(pathSegments[0])
  ) {
    return validVideoId(pathSegments[1])
  }

  return null
}

export function isYoutubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value)
}
