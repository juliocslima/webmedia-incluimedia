export type TimedCue = {
  id: string
  start: number
  end: number
  text: string
}

export type Chapter = {
  id: string
  start: number
  title: string
}

export type AccessibilityProfile =
  | 'default'
  | 'low-vision'
  | 'deaf-hard-hearing'
  | 'cognitive'
  | 'low-bandwidth'
  | 'no-audio'

export type AudioInterval = {
  start: number
  end: number
}

export type DescriptionCandidate = AudioInterval & {
  score: 'medium' | 'high'
}

export type AudioAnalysisReport = {
  generatedAt: string
  duration: number
  originalSampleRate: number
  analysisSampleRate: number
  windowMs: number
  silenceThreshold: number
  noiseFloorDb: number
  speechReferenceDb: number
  pauses: AudioInterval[]
  speechSegments: AudioInterval[]
  descriptionCandidates: DescriptionCandidate[]
  algorithm: string
}

export type ReviewStats = {
  captionAccepted: number
  captionRejected: number
  descriptionAccepted: number
  descriptionRejected: number
}

export type EvaluationBaseline = {
  capturedAt: string
  score: number
  captionCoveragePercent: number
  issueCount: number
  errorCount: number
  warningCount: number
  captionCount: number
  descriptionCount: number
  chapterCount: number
}

export type AuthoringCounters = {
  manualCaptionCreates: number
  manualDescriptionCreates: number
  manualChapterCreates: number
  manualChapterEdits: number
  manualChapterDeletes: number
  manualCueEdits: number
  manualCueDeletes: number
  captionImports: number
  importedCaptionCues: number
  simpleDraftGenerations: number
}

export type EvaluationTimings = {
  audioAnalysisMs: number
  asrMs: number
  audioAnalysisRuns: number
  asrRuns: number
}

export type SessionEvent = {
  at: string
  category: 'authoring' | 'assistant' | 'evaluation' | 'project' | 'export'
  action: string
  detail?: string
}

export type EvaluationSession = {
  startedAt: string
  baseline: EvaluationBaseline | null
  counters: AuthoringCounters
  timings: EvaluationTimings
  events: SessionEvent[]
}

export type ProjectSnapshot = {
  schemaVersion: 2 | 3 | 4
  projectName: string
  savedAt: string
  media: {
    name: string | null
    type: string | null
    duration: number
  }
  captions: TimedCue[]
  descriptions: TimedCue[]
  chapters: Chapter[]
  simpleTranscript: string
  profile: AccessibilityProfile
  evaluation?: EvaluationSession
  ai?: {
    analysis: AudioAnalysisReport | null
    captionSuggestions: TimedCue[]
    descriptionSuggestions: TimedCue[]
    reviewStats: ReviewStats
    asrEngine: 'webgpu' | 'wasm'
    asrLanguage: string
    asrModel: string
  }
}

export type ValidationSeverity = 'error' | 'warning' | 'info'

export type ValidationIssue = {
  id: string
  severity: ValidationSeverity
  track: 'captions' | 'descriptions' | 'chapters' | 'project'
  message: string
  cueId?: string
  time?: number
}
