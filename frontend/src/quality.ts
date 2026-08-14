import type { Chapter, TimedCue, ValidationIssue } from './types'

function mergedCoverage(cues: TimedCue[], duration: number): number {
  if (!duration || duration <= 0 || cues.length === 0) return 0
  const intervals = cues
    .filter((cue) => cue.end > cue.start)
    .map((cue) => [Math.max(0, cue.start), Math.min(duration, cue.end)] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0])
  if (!intervals.length) return 0
  let covered = 0
  let [start, end] = intervals[0]
  for (let i = 1; i < intervals.length; i += 1) {
    const [nextStart, nextEnd] = intervals[i]
    if (nextStart <= end) end = Math.max(end, nextEnd)
    else {
      covered += end - start
      start = nextStart
      end = nextEnd
    }
  }
  covered += end - start
  return Math.min(100, (covered / duration) * 100)
}

export function captionCoverage(captions: TimedCue[], duration: number): number {
  return mergedCoverage(captions, duration)
}

export function validateProject(
  captions: TimedCue[],
  descriptions: TimedCue[],
  chapters: Chapter[],
  duration: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const validateCues = (track: 'captions' | 'descriptions', cues: TimedCue[]) => {
    const ordered = [...cues].sort((a, b) => a.start - b.start)
    ordered.forEach((cue, index) => {
      const length = cue.end - cue.start
      if (!cue.text.trim()) issues.push({ id: `${track}-${cue.id}-empty`, severity: 'error', track, cueId: cue.id, time: cue.start, message: 'Segmento sem texto.' })
      if (cue.start < 0 || cue.end <= cue.start) issues.push({ id: `${track}-${cue.id}-time`, severity: 'error', track, cueId: cue.id, time: cue.start, message: 'Intervalo temporal inválido: o fim deve ser maior que o início.' })
      if (duration > 0 && cue.end > duration + 0.05) issues.push({ id: `${track}-${cue.id}-bounds`, severity: 'error', track, cueId: cue.id, time: cue.start, message: 'Segmento ultrapassa a duração do vídeo.' })
      const maxDuration = track === 'captions' ? 7 : 15
      if (length > maxDuration) issues.push({ id: `${track}-${cue.id}-long`, severity: 'warning', track, cueId: cue.id, time: cue.start, message: `Segmento longo (${length.toFixed(1)} s). Considere dividir para facilitar revisão e sincronização.` })
      if (track === 'captions' && length > 0) {
        const cps = cue.text.replace(/\s/g, '').length / length
        if (cps > 20) issues.push({ id: `${track}-${cue.id}-cps`, severity: 'warning', track, cueId: cue.id, time: cue.start, message: `Velocidade de leitura elevada (${cps.toFixed(1)} caracteres/s).` })
      }
      const next = ordered[index + 1]
      if (next && cue.end > next.start + 0.01) issues.push({ id: `${track}-${cue.id}-overlap`, severity: 'warning', track, cueId: cue.id, time: next.start, message: `Sobreposição com o segmento seguinte (${(cue.end - next.start).toFixed(2)} s).` })
    })
  }

  validateCues('captions', captions)
  validateCues('descriptions', descriptions)

  const orderedChapters = [...chapters].sort((a, b) => a.start - b.start)
  orderedChapters.forEach((chapter, index) => {
    if (!chapter.title.trim()) issues.push({ id: `chapter-${chapter.id}-empty`, severity: 'warning', track: 'chapters', time: chapter.start, message: 'Capítulo sem título.' })
    if (chapter.start < 0 || (duration > 0 && chapter.start > duration)) issues.push({ id: `chapter-${chapter.id}-bounds`, severity: 'error', track: 'chapters', time: chapter.start, message: 'Capítulo fora dos limites do vídeo.' })
    const next = orderedChapters[index + 1]
    if (next && Math.abs(next.start - chapter.start) < 0.05) issues.push({ id: `chapter-${chapter.id}-duplicate`, severity: 'warning', track: 'chapters', time: chapter.start, message: 'Dois capítulos começam praticamente no mesmo instante.' })
  })

  if (duration > 0 && captions.length === 0) issues.push({ id: 'project-no-captions', severity: 'info', track: 'project', message: 'Nenhuma legenda foi criada ou importada.' })
  if (duration > 60 && chapters.length === 0) issues.push({ id: 'project-no-chapters', severity: 'info', track: 'project', message: 'Vídeo com mais de 1 minuto sem capítulos semânticos.' })
  return issues
}

export function accessibilityScore(
  captions: TimedCue[],
  descriptions: TimedCue[],
  chapters: Chapter[],
  duration: number,
  transcript: string,
  simpleTranscript: string,
) {
  const coverage = captionCoverage(captions, duration)
  const components = [
    { key: 'captions', label: 'Cobertura temporal de legendas', weight: 35, value: coverage / 100 },
    { key: 'transcript', label: 'Transcrição textual', weight: 20, value: transcript.trim() ? 1 : 0 },
    { key: 'descriptions', label: 'Descrições visuais', weight: 20, value: descriptions.length ? 1 : 0 },
    { key: 'chapters', label: 'Capítulos semânticos', weight: 15, value: chapters.length ? 1 : 0 },
    { key: 'simple', label: 'Versão textual simplificada', weight: 10, value: simpleTranscript.trim() ? 1 : 0 },
  ]
  const score = Math.round(components.reduce((sum, item) => sum + item.weight * item.value, 0))
  return { score, coverage, components }
}
