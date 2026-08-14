import type { AudioAnalysisReport, AudioInterval } from './types'

const TARGET_SAMPLE_RATE = 16_000
const WINDOW_MS = 100
const MIN_SEGMENT_SECONDS = 0.7
const MIN_PAUSE_SECONDS = 0.55
const AD_PAUSE_SECONDS = 1.25
const MAX_ASR_SEGMENT_SECONDS = 26

export type PreparedAudio = {
  samples: Float32Array
  report: AudioAnalysisReport
}

export async function prepareAudio(file: File): Promise<PreparedAudio> {
  const AudioContextClass = window.AudioContext
  const context = new AudioContextClass()
  try {
    const bytes = await file.arrayBuffer()
    const decoded = await context.decodeAudioData(bytes.slice(0))
    const mono = mixToMono(decoded)
    const samples = resampleLinear(mono, decoded.sampleRate, TARGET_SAMPLE_RATE)
    const report = analyzeAudioSamples(samples, TARGET_SAMPLE_RATE, decoded.sampleRate)
    return { samples, report }
  } finally {
    await context.close().catch(() => undefined)
  }
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i += 1) mono[i] += data[i] / buffer.numberOfChannels
  }
  return mono
}

function resampleLinear(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return new Float32Array(input)
  const ratio = sourceRate / targetRate
  const outputLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    const source = i * ratio
    const left = Math.floor(source)
    const right = Math.min(input.length - 1, left + 1)
    const alpha = source - left
    output[i] = input[left] * (1 - alpha) + input[right] * alpha
  }
  return output
}

export function analyzeAudioSamples(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE, originalSampleRate = sampleRate): AudioAnalysisReport {
  const windowSamples = Math.max(1, Math.round(sampleRate * WINDOW_MS / 1000))
  const rms: number[] = []
  for (let offset = 0; offset < samples.length; offset += windowSamples) {
    const end = Math.min(samples.length, offset + windowSamples)
    let sum = 0
    for (let i = offset; i < end; i += 1) sum += samples[i] * samples[i]
    rms.push(Math.sqrt(sum / Math.max(1, end - offset)))
  }

  const sorted = [...rms].sort((a, b) => a - b)
  const noiseFloor = percentile(sorted, 0.2)
  const speechReference = percentile(sorted, 0.8)
  const silenceThreshold = clamp(noiseFloor + (speechReference - noiseFloor) * 0.18, 0.004, 0.04)
  const rawPauses = intervalsFromMask(rms.map((value) => value < silenceThreshold), WINDOW_MS / 1000)
  const duration = samples.length / sampleRate
  const pauses = rawPauses
    .filter((interval) => interval.end - interval.start >= MIN_PAUSE_SECONDS)
    .map((interval) => ({ ...interval, start: Math.max(0, interval.start), end: Math.min(duration, interval.end) }))

  const speechSegments = splitLongSegments(complementIntervals(pauses, duration)
    .filter((interval) => interval.end - interval.start >= MIN_SEGMENT_SECONDS), MAX_ASR_SEGMENT_SECONDS)

  const descriptionCandidates = pauses
    .filter((interval) => interval.start > 0.25 && interval.end < duration - 0.25 && interval.end - interval.start >= AD_PAUSE_SECONDS)
    .map((interval) => ({
      ...interval,
      score: candidateScore(interval.end - interval.start),
    }))

  return {
    generatedAt: new Date().toISOString(),
    duration,
    originalSampleRate,
    analysisSampleRate: sampleRate,
    windowMs: WINDOW_MS,
    silenceThreshold,
    noiseFloorDb: toDb(noiseFloor),
    speechReferenceDb: toDb(speechReference),
    pauses,
    speechSegments,
    descriptionCandidates,
    algorithm: 'adaptive-rms-pause-analysis-v1',
  }
}

function intervalsFromMask(mask: boolean[], stepSeconds: number): AudioInterval[] {
  const intervals: AudioInterval[] = []
  let start: number | null = null
  mask.forEach((silent, index) => {
    if (silent && start === null) start = index * stepSeconds
    if (!silent && start !== null) {
      intervals.push({ start, end: index * stepSeconds })
      start = null
    }
  })
  if (start !== null) intervals.push({ start, end: mask.length * stepSeconds })
  return intervals
}

function complementIntervals(pauses: AudioInterval[], duration: number): AudioInterval[] {
  const segments: AudioInterval[] = []
  let cursor = 0
  for (const pause of pauses) {
    if (pause.start > cursor) segments.push({ start: cursor, end: pause.start })
    cursor = Math.max(cursor, pause.end)
  }
  if (cursor < duration) segments.push({ start: cursor, end: duration })
  return segments
}

function splitLongSegments(segments: AudioInterval[], maxLength: number): AudioInterval[] {
  const output: AudioInterval[] = []
  for (const segment of segments) {
    let start = segment.start
    while (segment.end - start > maxLength) {
      output.push({ start, end: start + maxLength })
      start += maxLength
    }
    if (segment.end - start >= MIN_SEGMENT_SECONDS) output.push({ start, end: segment.end })
  }
  return output
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))]
}

function candidateScore(duration: number): 'medium' | 'high' {
  return duration >= 2.4 ? 'high' : 'medium'
}

function toDb(value: number) {
  return 20 * Math.log10(Math.max(1e-8, value))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
