import { describe, expect, it } from 'vitest'
import { prepareContentForModel } from '../../worker/content'

describe('prepareContentForModel', () => {
  it('keeps short normalized content intact', () => {
    expect(prepareContentForModel('A short\n\nclaim.')).toBe('A short claim.')
  })

  it('uses random whole-text chunks within the model budget', () => {
    const text = Array.from(
      { length: 20 },
      (_, index) =>
        `CHUNK_${index.toString().padStart(2, '0')} ${'x'.repeat(58)}.`,
    ).join(' ')
    const sampled = prepareContentForModel(text, {
      maxCharacters: 500,
      chunkCharacters: 70,
      randomIndex: () => 0,
    })

    expect(sampled.length).toBeLessThanOrEqual(500)
    expect(sampled).toContain('[Random sample from')
    expect(sampled).not.toContain('CHUNK_00')
    expect(sampled).toContain('CHUNK_01')

    const excerptNumbers = [...sampled.matchAll(/\[Excerpt (\d+)\//g)].map(
      (match) => Number(match[1]),
    )
    expect(excerptNumbers).toEqual([...excerptNumbers].sort((a, b) => a - b))
  })
})
