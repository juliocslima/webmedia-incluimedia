import type { EvaluationBaseline, EvaluationSession, ReviewStats, ValidationIssue } from './types'

export function issueBreakdown(issues: ValidationIssue[]) {
  return {
    total: issues.length,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  }
}

export function captureBaseline(
  score: number,
  coverage: number,
  issues: ValidationIssue[],
  counts: { captions: number; descriptions: number; chapters: number },
): EvaluationBaseline {
  const breakdown = issueBreakdown(issues)
  return {
    capturedAt: new Date().toISOString(),
    score,
    captionCoveragePercent: Number(coverage.toFixed(2)),
    issueCount: breakdown.total,
    errorCount: breakdown.errors,
    warningCount: breakdown.warnings,
    captionCount: counts.captions,
    descriptionCount: counts.descriptions,
    chapterCount: counts.chapters,
  }
}

export function acceptanceRate(reviewStats: ReviewStats) {
  const accepted = reviewStats.captionAccepted + reviewStats.descriptionAccepted
  const rejected = reviewStats.captionRejected + reviewStats.descriptionRejected
  const reviewed = accepted + rejected
  return reviewed ? (accepted / reviewed) * 100 : 0
}

export function processingFactor(processingMs: number, durationSeconds: number) {
  if (!durationSeconds || durationSeconds <= 0) return 0
  return processingMs / 1000 / durationSeconds
}

export function buildEvaluationReport(args: {
  session: EvaluationSession
  score: number
  coverage: number
  issues: ValidationIssue[]
  reviewStats: ReviewStats
  counts: { captions: number; descriptions: number; chapters: number }
  duration: number
  pendingSuggestions: number
}) {
  const { session, score, coverage, issues, reviewStats, counts, duration, pendingSuggestions } = args
  const now = Date.now()
  const startedAtMs = Date.parse(session.startedAt)
  const sessionDurationMs = Number.isFinite(startedAtMs) ? Math.max(0, now - startedAtMs) : 0
  const currentIssues = issueBreakdown(issues)
  const baseline = session.baseline
  const totalProcessingMs = session.timings.audioAnalysisMs + session.timings.asrMs
  const accepted = reviewStats.captionAccepted + reviewStats.descriptionAccepted
  const rejected = reviewStats.captionRejected + reviewStats.descriptionRejected
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    session: {
      startedAt: session.startedAt,
      durationMs: sessionDurationMs,
      durationSeconds: Number((sessionDurationMs / 1000).toFixed(1)),
      baselineCapturedAt: baseline?.capturedAt ?? null,
    },
    before: baseline,
    after: {
      score,
      captionCoveragePercent: Number(coverage.toFixed(2)),
      issueCount: currentIssues.total,
      errorCount: currentIssues.errors,
      warningCount: currentIssues.warnings,
      captionCount: counts.captions,
      descriptionCount: counts.descriptions,
      chapterCount: counts.chapters,
    },
    delta: baseline ? {
      scorePoints: score - baseline.score,
      captionCoveragePercentagePoints: Number((coverage - baseline.captionCoveragePercent).toFixed(2)),
      issues: currentIssues.total - baseline.issueCount,
      errors: currentIssues.errors - baseline.errorCount,
      warnings: currentIssues.warnings - baseline.warningCount,
      captions: counts.captions - baseline.captionCount,
      descriptions: counts.descriptions - baseline.descriptionCount,
      chapters: counts.chapters - baseline.chapterCount,
    } : null,
    assistance: {
      accepted,
      rejected,
      reviewed: accepted + rejected,
      acceptanceRatePercent: Number(acceptanceRate(reviewStats).toFixed(2)),
      pendingSuggestions,
      reviewStats,
    },
    authoring: session.counters,
    processing: {
      audioAnalysisMs: Number(session.timings.audioAnalysisMs.toFixed(1)),
      asrMs: Number(session.timings.asrMs.toFixed(1)),
      totalProcessingMs: Number(totalProcessingMs.toFixed(1)),
      realTimeFactor: Number(processingFactor(totalProcessingMs, duration).toFixed(4)),
      videoDurationSeconds: Number(duration.toFixed(3)),
    },
    events: session.events,
    interpretation: {
      note: 'Metrics describe this authoring session and heuristic accessibility indicators; they do not constitute WCAG conformance evidence.',
      baselineRequiredForBeforeAfter: true,
      mediaUploadedForInference: false,
    },
  }
}
