import { forwardRef, useImperativeHandle } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import type { TurnstileWidgetHandle } from '../../src/components/TurnstileWidget'

const resetWidget = vi.fn()

vi.mock('../../src/components/TurnstileWidget', () => ({
  TurnstileWidget: forwardRef<
    TurnstileWidgetHandle,
    { onToken: (token: string) => void }
  >(function MockTurnstile({ onToken }, ref) {
    useImperativeHandle(ref, () => ({ reset: resetWidget }))
    return (
      <button type="button" onClick={() => onToken('test-token')}>
        Verify test visitor
      </button>
    )
  }),
}))

describe('App', () => {
  beforeEach(() => {
    resetWidget.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits verified content and presents a verdict with its reason', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          verdict: 'FALSE',
          reason: 'The claim conflicts with established astronomical evidence.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.type(
      screen.getByLabelText(/claim, article, or public article url/i),
      'The Moon is made of cheese.',
    )
    await user.click(
      screen.getByRole('button', { name: /verify test visitor/i }),
    )
    await user.click(screen.getByRole('button', { name: /analyze claim/i }))

    expect(await screen.findByRole('heading', { name: 'FALSE' })).toBeVisible()
    expect(
      screen.getByText(/conflicts with established astronomical evidence/i),
    ).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analyze',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(resetWidget).toHaveBeenCalledOnce()
  })

  it('shows a safe API error and resets the single-use Turnstile token', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'ANALYSIS_UNAVAILABLE',
              message: 'The analysis service is temporarily unavailable.',
            },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    render(<App />)

    await user.type(
      screen.getByLabelText(/claim, article, or public article url/i),
      'A claim worth checking',
    )
    await user.click(
      screen.getByRole('button', { name: /verify test visitor/i }),
    )
    await user.click(screen.getByRole('button', { name: /analyze claim/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'temporarily unavailable',
    )
    expect(resetWidget).toHaveBeenCalledOnce()
  })
})
