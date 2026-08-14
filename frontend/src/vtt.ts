import type { TimedCue, Chapter } from './types'

export function parseTimestamp(value: string): number {
  const parts = value.trim().replace(',', '.').split(':').map(Number)
  if (parts.some(Number.isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, seconds || 0)
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`
}

export function formatSrtTimestamp(seconds: number): string {
  return formatTimestamp(seconds).replace('.', ',')
}

export function parseVtt(content: string): TimedCue[] {
  const normalized = content.replace(/\r/g, '').trim()
  const blocks = normalized.split(/\n\n+/)
  const cues: TimedCue[] = []

  for (const block of blocks) {
    if (!block || block.startsWith('WEBVTT') || block.startsWith('NOTE')) continue
    const lines = block.split('\n')
    const timeIndex = lines.findIndex((line) => line.includes('-->'))
    if (timeIndex < 0) continue
    const [startRaw, endRawWithSettings] = lines[timeIndex].split('-->').map((x) => x.trim())
    const endRaw = endRawWithSettings.split(/\s+/)[0]
    const text = lines.slice(timeIndex + 1).join('\n').trim()
    cues.push({
      id: crypto.randomUUID(),
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      text,
    })
  }
  return cues.sort((a, b) => a.start - b.start)
}

export function parseSrt(content: string): TimedCue[] {
  const normalized = content.replace(/\r/g, '').trim()
  if (!normalized) return []
  const cues: TimedCue[] = []
  for (const block of normalized.split(/\n\n+/)) {
    const lines = block.split('\n')
    const timeIndex = lines.findIndex((line) => line.includes('-->'))
    if (timeIndex < 0) continue
    const [startRaw, endRaw] = lines[timeIndex].split('-->').map((x) => x.trim())
    cues.push({
      id: crypto.randomUUID(),
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw.split(/\s+/)[0]),
      text: lines.slice(timeIndex + 1).join('\n').trim(),
    })
  }
  return cues.sort((a, b) => a.start - b.start)
}

export function cuesToVtt(cues: TimedCue[]): string {
  return `WEBVTT\n\n${[...cues]
    .sort((a, b) => a.start - b.start)
    .map((cue, index) => `${index + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}`)
    .join('\n\n')}\n`
}

export function cuesToSrt(cues: TimedCue[]): string {
  return `${[...cues]
    .sort((a, b) => a.start - b.start)
    .map((cue, index) => `${index + 1}\n${formatSrtTimestamp(cue.start)} --> ${formatSrtTimestamp(cue.end)}\n${cue.text}`)
    .join('\n\n')}\n`
}

export function chaptersToVtt(chapters: Chapter[], duration: number): string {
  const ordered = [...chapters].sort((a, b) => a.start - b.start)
  const cues = ordered.map((chapter, index) => ({
    id: chapter.id,
    start: chapter.start,
    end: ordered[index + 1]?.start ?? duration,
    text: chapter.title,
  }))
  return cuesToVtt(cues)
}
