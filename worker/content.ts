export const MAX_MODEL_CONTENT_CHARACTERS = 20_000
const DEFAULT_CHUNK_CHARACTERS = 1_800

type RandomIndex = (upperExclusive: number) => number

interface SamplingOptions {
  maxCharacters?: number
  chunkCharacters?: number
  randomIndex?: RandomIndex
}

function secureRandomIndex(upperExclusive: number): number {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] % upperExclusive
}

function chunkText(text: string, chunkCharacters: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + chunkCharacters, text.length)

    if (end < text.length) {
      const sentenceBoundary = Math.max(
        text.lastIndexOf('. ', end),
        text.lastIndexOf('! ', end),
        text.lastIndexOf('? ', end),
      )
      const wordBoundary = text.lastIndexOf(' ', end)
      const preferredBoundary =
        sentenceBoundary > start + chunkCharacters / 2
          ? sentenceBoundary + 1
          : wordBoundary

      if (preferredBoundary > start) {
        end = preferredBoundary
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    start = end
    while (text[start] === ' ') {
      start += 1
    }
  }

  return chunks
}

function shuffledIndices(length: number, randomIndex: RandomIndex): number[] {
  const indices = Array.from({ length }, (_, index) => index)

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    if (
      !Number.isInteger(swapIndex) ||
      swapIndex < 0 ||
      swapIndex > index
    ) {
      throw new Error('The random index generator returned an invalid value.')
    }

    ;[indices[index], indices[swapIndex]] = [
      indices[swapIndex],
      indices[index],
    ]
  }

  return indices
}

export function prepareContentForModel(
  value: string,
  options: SamplingOptions = {},
): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  const maxCharacters =
    options.maxCharacters ?? MAX_MODEL_CONTENT_CHARACTERS
  const chunkCharacters =
    options.chunkCharacters ?? DEFAULT_CHUNK_CHARACTERS
  const randomIndex = options.randomIndex ?? secureRandomIndex

  if (maxCharacters < 200 || chunkCharacters < 40) {
    throw new Error('The sampling limits are too small.')
  }

  if (normalized.length <= maxCharacters) {
    return normalized
  }

  const chunks = chunkText(normalized, chunkCharacters)
  const header =
    `[Random sample from ${chunks.length} chunks. ` +
    'Excerpts are shown in their original source order.]'
  const selectedIndices: number[] = []
  let usedCharacters = header.length

  for (const index of shuffledIndices(chunks.length, randomIndex)) {
    const excerptHeader = `[Excerpt ${index + 1}/${chunks.length}]`
    const addedCharacters =
      2 + excerptHeader.length + 1 + chunks[index].length

    if (usedCharacters + addedCharacters <= maxCharacters) {
      selectedIndices.push(index)
      usedCharacters += addedCharacters
    }
  }

  selectedIndices.sort((left, right) => left - right)

  return [
    header,
    ...selectedIndices.map(
      (index) => `[Excerpt ${index + 1}/${chunks.length}]\n${chunks[index]}`,
    ),
  ].join('\n\n')
}
