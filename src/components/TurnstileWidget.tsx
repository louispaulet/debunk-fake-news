import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
} from 'react'

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  theme: 'light' | 'dark' | 'auto'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
}

interface TurnstileApi {
  ready: (callback: () => void) => void
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void
}

interface TurnstileWidgetProps {
  sitekey: string
  onToken: (token: string | null) => void
  onError: (message: string | null) => void
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile)
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script]',
    )
    const script = existing ?? document.createElement('script')

    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
      } else {
        reject(new Error('Turnstile loaded without a browser API.'))
      }
    }

    const handleError = () => {
      scriptPromise = null
      reject(new Error('Could not load Turnstile.'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existing) {
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.defer = true
      script.dataset.turnstileScript = 'true'
      document.head.append(script)
    }
  })

  return scriptPromise
}

function TurnstileWidgetComponent(
  { sitekey, onToken, onError }: TurnstileWidgetProps,
  ref: ForwardedRef<TurnstileWidgetHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }),
    [],
  )

  useEffect(() => {
    let active = true

    if (!sitekey) {
      onError('Turnstile is not configured for this deployment.')
      return
    }

    void loadTurnstile()
      .then((turnstile) => {
        turnstile.ready(() => {
          if (!active || !containerRef.current || widgetIdRef.current) {
            return
          }

          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey,
            action: 'analyze',
            theme: 'light',
            callback: (token) => {
              onError(null)
              onToken(token)
            },
            'error-callback': () => {
              onToken(null)
              onError('The human check failed. Please try again.')
            },
            'expired-callback': () => {
              onToken(null)
              onError('The human check expired. Please complete it again.')
            },
            'timeout-callback': () => {
              onToken(null)
              onError('The human check timed out. Please try again.')
            },
          })
        })
      })
      .catch(() => {
        if (active) {
          onToken(null)
          onError('Could not load the human check. Please refresh the page.')
        }
      })

    return () => {
      active = false
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onError, onToken, sitekey])

  return (
    <div
      ref={containerRef}
      className="min-h-[65px]"
      aria-label="Human verification"
    />
  )
}

export const TurnstileWidget = forwardRef(TurnstileWidgetComponent)
