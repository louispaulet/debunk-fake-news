import { describe, expect, it } from 'vitest'
import { youtubeVideoIdFromUrl } from '../../shared/youtube'

describe('youtubeVideoIdFromUrl', () => {
  it('extracts the supplied pyramid-video ID', () => {
    expect(
      youtubeVideoIdFromUrl(
        'https://www.youtube.com/watch?v=_neA7v3ulPU',
      ),
    ).toBe('_neA7v3ulPU')
  })

  it('supports common YouTube URL forms without matching lookalike hosts', () => {
    expect(youtubeVideoIdFromUrl('https://youtu.be/_neA7v3ulPU?t=20')).toBe(
      '_neA7v3ulPU',
    )
    expect(
      youtubeVideoIdFromUrl(
        'https://www.youtube.com/shorts/_neA7v3ulPU',
      ),
    ).toBe('_neA7v3ulPU')
    expect(
      youtubeVideoIdFromUrl(
        'https://www.youtube.com.evil.example/watch?v=_neA7v3ulPU',
      ),
    ).toBeNull()
  })
})
