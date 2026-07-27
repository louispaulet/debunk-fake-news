export type Verdict = 'TRUE' | 'FALSE' | 'UNVERIFIABLE'

export interface AnalysisResult {
  verdict: Verdict
  reason: string
}

export interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}
