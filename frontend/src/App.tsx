import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import JSZip from 'jszip'
import Timeline from './Timeline'
import AIAssistant from './AIAssistant'
import EvaluationDashboard from './EvaluationDashboard'
import { prepareAudio } from './audioAnalysis'
import type { AccessibilityProfile, AudioAnalysisReport, Chapter, EvaluationSession, ProjectSnapshot, ReviewStats, TimedCue, ValidationIssue } from './types'
import { accessibilityScore, validateProject } from './quality'
import { buildEvaluationReport, captureBaseline } from './metrics'
import { loadProject, saveProject } from './storage'
import { chaptersToVtt, cuesToSrt, cuesToVtt, formatTimestamp, parseSrt, parseVtt } from './vtt'

const profileLabels: Record<AccessibilityProfile, string> = {
  default: 'Padrão',
  'low-vision': 'Baixa visão',
  'deaf-hard-hearing': 'Deficiência auditiva',
  cognitive: 'Apoio cognitivo',
  'low-bandwidth': 'Baixa conectividade',
  'no-audio': 'Ambiente sem áudio',
}

const severityLabels = { error: 'Erro', warning: 'Atenção', info: 'Sugestão' } as const

type Tab = 'author' | 'assistant' | 'inspector' | 'evaluation' | 'preview' | 'export'

function newEvaluationSession(): EvaluationSession {
  return {
    startedAt: new Date().toISOString(),
    baseline: null,
    counters: {
      manualCaptionCreates: 0, manualDescriptionCreates: 0, manualChapterCreates: 0,
      manualChapterEdits: 0, manualChapterDeletes: 0, manualCueEdits: 0, manualCueDeletes: 0, captionImports: 0, importedCaptionCues: 0,
      simpleDraftGenerations: 0,
    },
    timings: { audioAnalysisMs: 0, asrMs: 0, audioAnalysisRuns: 0, asrRuns: 0 },
    events: [],
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const asrWorkerRef = useRef<Worker | null>(null)
  const audioSamplesRef = useRef<Float32Array | null>(null)
  const asrStartRef = useRef<number | null>(null)
  const editedCueIdsRef = useRef<Set<string>>(new Set())
  const editedChapterIdsRef = useRef<Set<string>>(new Set())
  const [projectName, setProjectName] = useState('Meu projeto acessível')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [captions, setCaptions] = useState<TimedCue[]>([])
  const [descriptions, setDescriptions] = useState<TimedCue[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [profile, setProfile] = useState<AccessibilityProfile>('default')
  const [simpleTranscript, setSimpleTranscript] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('author')
  const [analysisReport, setAnalysisReport] = useState<AudioAnalysisReport | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const webGpuAvailable = typeof navigator !== 'undefined' && 'gpu' in navigator
  const [asrEngine, setAsrEngine] = useState<'webgpu' | 'wasm'>(webGpuAvailable ? 'webgpu' : 'wasm')
  const [asrLanguage, setAsrLanguage] = useState('portuguese')
  const [asrStatus, setAsrStatus] = useState('Execute a análise acústica antes da transcrição.')
  const [asrBusy, setAsrBusy] = useState(false)
  const [asrProgress, setAsrProgress] = useState(0)
  const [captionSuggestions, setCaptionSuggestions] = useState<TimedCue[]>([])
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<TimedCue[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ captionAccepted: 0, captionRejected: 0, descriptionAccepted: 0, descriptionRejected: 0 })
  const [evaluationSession, setEvaluationSession] = useState<EvaluationSession>(() => newEvaluationSession())
  const [status, setStatus] = useState('Carregue um vídeo local para iniciar a autoria.')

  const recordEvent = (category: 'authoring' | 'assistant' | 'evaluation' | 'project' | 'export', action: string, detail?: string) => {
    setEvaluationSession((session) => ({
      ...session,
      events: [...session.events, { at: new Date().toISOString(), category, action, detail }].slice(-200),
    }))
  }

  const incrementCounter = (key: keyof EvaluationSession['counters'], amount = 1) => {
    setEvaluationSession((session) => ({
      ...session,
      counters: { ...session.counters, [key]: session.counters[key] + amount },
    }))
  }

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    const worker = new Worker(new URL('./asr.worker.ts', import.meta.url), { type: 'module' })
    asrWorkerRef.current = worker
    const onMessage = (event: MessageEvent) => {
      const data = event.data ?? {}
      if (data.status === 'loading-model') {
        setAsrStatus(`Carregando ${data.model} para execução ${String(data.engine).toUpperCase()}…`)
      } else if (data.status === 'model-progress') {
        const progress = Number(data.event?.progress)
        const file = data.event?.file ? ` · ${data.event.file}` : ''
        if (Number.isFinite(progress)) setAsrStatus(`Preparando modelo: ${Math.round(progress)}%${file}`)
      } else if (data.status === 'model-ready') {
        setAsrStatus('Modelo pronto. Transcrevendo os trechos detectados…')
      } else if (data.status === 'segment-start') {
        setAsrProgress(data.total ? (data.index / data.total) * 100 : 0)
        setAsrStatus(`Transcrevendo trecho ${data.index + 1} de ${data.total}…`)
      } else if (data.status === 'segment-result') {
        const cue: TimedCue = {
          id: data.segment.id,
          start: data.segment.start,
          end: data.segment.end,
          text: data.text || '[ASR sem texto — revisar este trecho]',
        }
        setCaptionSuggestions((items) => [...items.filter((item) => item.id !== cue.id), cue].sort((a, b) => a.start - b.start))
        setAsrProgress(data.total ? ((data.index + 1) / data.total) * 100 : 100)
      } else if (data.status === 'complete') {
        const elapsed = asrStartRef.current == null ? 0 : performance.now() - asrStartRef.current
        asrStartRef.current = null
        if (elapsed > 0) setEvaluationSession((session) => ({ ...session, timings: { ...session.timings, asrMs: session.timings.asrMs + elapsed, asrRuns: session.timings.asrRuns + 1 } }))
        recordEvent('assistant', 'ASR local concluído', `${data.total ?? 0} segmentos · ${(elapsed / 1000).toFixed(2)} s`)
        setAsrBusy(false)
        setAsrProgress(100)
        setAsrStatus(`Transcrição concluída localmente com ${data.model}. Revise as sugestões antes de aceitar.`)
      } else if (data.status === 'error') {
        const elapsed = asrStartRef.current == null ? 0 : performance.now() - asrStartRef.current
        asrStartRef.current = null
        if (elapsed > 0) setEvaluationSession((session) => ({ ...session, timings: { ...session.timings, asrMs: session.timings.asrMs + elapsed, asrRuns: session.timings.asrRuns + 1 } }))
        recordEvent('assistant', 'ASR local falhou', String(data.message ?? 'erro desconhecido'))
        setAsrBusy(false)
        setAsrStatus(`Falha no ASR local: ${data.message}`)
      }
    }
    worker.addEventListener('message', onMessage)
    return () => {
      worker.removeEventListener('message', onMessage)
      worker.terminate()
      asrWorkerRef.current = null
    }
  }, [])

  const transcript = useMemo(
    () => captions.map((cue) => `[${formatTimestamp(cue.start)}] ${cue.text}`).join('\n'),
    [captions],
  )

  const issues = useMemo(
    () => validateProject(captions, descriptions, chapters, duration),
    [captions, descriptions, chapters, duration],
  )

  const accessibility = useMemo(
    () => accessibilityScore(captions, descriptions, chapters, duration, transcript, simpleTranscript),
    [captions, descriptions, chapters, duration, transcript, simpleTranscript],
  )

  const activeCaption = captions.find((cue) => currentTime >= cue.start && currentTime <= cue.end)
  const activeDescription = descriptions.find((cue) => currentTime >= cue.start && currentTime <= cue.end)

  const loadVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    audioSamplesRef.current = null
    setAnalysisReport(null)
    setCaptionSuggestions([])
    setDescriptionSuggestions([])
    setAsrStatus('Execute a análise acústica antes da transcrição.')
    recordEvent('project', 'Vídeo carregado', `${file.name} · ${file.type || 'tipo desconhecido'}`)
    setStatus(`Vídeo carregado localmente: ${file.name}. O arquivo não foi enviado a um servidor.`)
    event.target.value = ''
  }

  const importCaptions = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    const parsed = file.name.toLowerCase().endsWith('.srt') ? parseSrt(content) : parseVtt(content)
    setCaptions(parsed)
    incrementCounter('captionImports')
    incrementCounter('importedCaptionCues', parsed.length)
    recordEvent('authoring', 'Legendas importadas', `${parsed.length} cues · ${file.name}`)
    setStatus(`${parsed.length} segmentos importados de ${file.name}.`)
    event.target.value = ''
  }

  const addCaption = () => {
    const start = currentTime
    incrementCounter('manualCaptionCreates')
    recordEvent('authoring', 'Legenda manual criada', formatTimestamp(start))
    setCaptions((items) => [...items, {
      id: crypto.randomUUID(),
      start,
      end: Math.min(duration || start + 3, start + 3),
      text: 'Nova legenda',
    }].sort((a, b) => a.start - b.start))
  }

  const addDescription = () => {
    const start = currentTime
    incrementCounter('manualDescriptionCreates')
    recordEvent('authoring', 'Descrição manual criada', formatTimestamp(start))
    setDescriptions((items) => [...items, {
      id: crypto.randomUUID(),
      start,
      end: Math.min(duration || start + 4, start + 4),
      text: 'Descreva a informação visual relevante.',
    }].sort((a, b) => a.start - b.start))
  }

  const addChapter = () => {
    incrementCounter('manualChapterCreates')
    recordEvent('authoring', 'Capítulo manual criado', formatTimestamp(currentTime))
    setChapters((items) => [...items, {
      id: crypto.randomUUID(),
      start: currentTime,
      title: 'Novo capítulo',
    }].sort((a, b) => a.start - b.start))
  }

  const updateChapterTitle = (id: string, title: string) => {
    if (!editedChapterIdsRef.current.has(id)) {
      editedChapterIdsRef.current.add(id)
      incrementCounter('manualChapterEdits')
      recordEvent('authoring', 'Capítulo revisado manualmente')
    }
    setChapters((items) => items.map((chapter) => chapter.id === id ? { ...chapter, title } : chapter))
  }

  const removeChapter = (id: string) => {
    incrementCounter('manualChapterDeletes')
    recordEvent('authoring', 'Capítulo removido')
    setChapters((items) => items.filter((chapter) => chapter.id !== id))
  }

  const updateCue = (kind: 'caption' | 'description', id: string, patch: Partial<TimedCue>) => {
    if (!editedCueIdsRef.current.has(id)) {
      editedCueIdsRef.current.add(id)
      incrementCounter('manualCueEdits')
      recordEvent('authoring', 'Cue revisado manualmente', kind === 'caption' ? 'legenda' : 'descrição')
    }
    const setter = kind === 'caption' ? setCaptions : setDescriptions
    setter((items) => items
      .map((cue) => cue.id === id ? { ...cue, ...patch } : cue)
      .sort((a, b) => a.start - b.start))
  }

  const removeCue = (kind: 'caption' | 'description', id: string) => {
    incrementCounter('manualCueDeletes')
    recordEvent('authoring', 'Cue removido', kind === 'caption' ? 'legenda' : 'descrição')
    const setter = kind === 'caption' ? setCaptions : setDescriptions
    setter((items) => items.filter((cue) => cue.id !== id))
  }

  const seek = (time: number) => {
    const safe = Math.max(0, Math.min(duration || time, time))
    if (videoRef.current) videoRef.current.currentTime = safe
    setCurrentTime(safe)
  }


  const analyzeAudio = async () => {
    if (!videoFile) return
    setAnalyzing(true)
    const analysisStartedAt = performance.now()
    setStatus('Analisando energia e pausas do áudio localmente…')
    try {
      const prepared = await prepareAudio(videoFile)
      audioSamplesRef.current = prepared.samples
      setAnalysisReport(prepared.report)
      setDuration((value) => value || prepared.report.duration)
      setCaptionSuggestions([])
      setDescriptionSuggestions(prepared.report.descriptionCandidates.map((candidate) => ({
        id: crypto.randomUUID(),
        start: candidate.start,
        end: candidate.end,
        text: `Janela acústica ${candidate.score === 'high' ? 'forte' : 'moderada'} para audiodescrição — revisar a cena antes de aceitar.`,
      })))
      setAsrStatus(`${prepared.report.speechSegments.length} trechos de fala preparados para ASR local.`)
      const elapsed = performance.now() - analysisStartedAt
      setEvaluationSession((session) => ({ ...session, timings: { ...session.timings, audioAnalysisMs: session.timings.audioAnalysisMs + elapsed, audioAnalysisRuns: session.timings.audioAnalysisRuns + 1 } }))
      recordEvent('assistant', 'Análise acústica concluída', `${prepared.report.speechSegments.length} falas · ${prepared.report.descriptionCandidates.length} janelas AD · ${(elapsed / 1000).toFixed(2)} s`)
      setStatus(`Análise concluída: ${prepared.report.speechSegments.length} trechos de fala e ${prepared.report.descriptionCandidates.length} janelas candidatas para audiodescrição.`)
    } catch (error) {
      const elapsed = performance.now() - analysisStartedAt
      setEvaluationSession((session) => ({ ...session, timings: { ...session.timings, audioAnalysisMs: session.timings.audioAnalysisMs + elapsed, audioAnalysisRuns: session.timings.audioAnalysisRuns + 1 } }))
      recordEvent('assistant', 'Análise acústica falhou', error instanceof Error ? error.message : String(error))
      setStatus(`Não foi possível decodificar/analisar o áudio deste vídeo: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const ensureAudioSamples = async () => {
    if (audioSamplesRef.current) return audioSamplesRef.current
    if (!videoFile) return null
    const prepared = await prepareAudio(videoFile)
    audioSamplesRef.current = prepared.samples
    setAnalysisReport(prepared.report)
    return prepared.samples
  }

  const runLocalAsr = async () => {
    if (!videoFile || !analysisReport?.speechSegments.length || !asrWorkerRef.current) return
    setAsrBusy(true)
    asrStartRef.current = performance.now()
    recordEvent('assistant', 'ASR local iniciado', `${asrEngine.toUpperCase()} · ${asrLanguage}`)
    setAsrProgress(0)
    setCaptionSuggestions([])
    setAsrStatus('Preparando áudio para o Whisper local…')
    try {
      const samples = await ensureAudioSamples()
      if (!samples) throw new Error('Áudio não disponível.')
      const audioCopy = new Float32Array(samples)
      const segments = analysisReport.speechSegments.map((segment) => ({ id: crypto.randomUUID(), ...segment }))
      asrWorkerRef.current.postMessage({
        type: 'transcribe',
        audio: audioCopy,
        segments,
        engine: asrEngine,
        language: asrLanguage,
      }, [audioCopy.buffer as ArrayBuffer])
    } catch (error) {
      const elapsed = asrStartRef.current == null ? 0 : performance.now() - asrStartRef.current
      asrStartRef.current = null
      if (elapsed > 0) setEvaluationSession((session) => ({ ...session, timings: { ...session.timings, asrMs: session.timings.asrMs + elapsed, asrRuns: session.timings.asrRuns + 1 } }))
      recordEvent('assistant', 'Falha ao preparar ASR', error instanceof Error ? error.message : String(error))
      setAsrBusy(false)
      setAsrStatus(`Falha ao preparar ASR: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const createCaptionPlaceholders = () => {
    if (!analysisReport) return
    setCaptionSuggestions(analysisReport.speechSegments.map((segment, index) => ({
      id: crypto.randomUUID(),
      start: segment.start,
      end: segment.end,
      text: `[Segmento de fala ${index + 1} — transcrever/revisar]`,
    })))
    recordEvent('assistant', 'Placeholders de legenda gerados', `${analysisReport.speechSegments.length} segmentos`)
    setStatus('Placeholders criados a partir da segmentação acústica. Revise e aceite somente os intervalos úteis.')
  }

  const acceptCaptionSuggestion = (id: string) => {
    const suggestion = captionSuggestions.find((cue) => cue.id === id)
    if (!suggestion) return
    setCaptions((items) => [...items, { ...suggestion, id: crypto.randomUUID() }].sort((a, b) => a.start - b.start))
    setCaptionSuggestions((items) => items.filter((cue) => cue.id !== id))
    setReviewStats((stats) => ({ ...stats, captionAccepted: stats.captionAccepted + 1 }))
    recordEvent('assistant', 'Sugestão de legenda aceita', formatTimestamp(suggestion.start))
  }

  const rejectCaptionSuggestion = (id: string) => {
    if (!captionSuggestions.some((cue) => cue.id === id)) return
    setCaptionSuggestions((items) => items.filter((cue) => cue.id !== id))
    setReviewStats((stats) => ({ ...stats, captionRejected: stats.captionRejected + 1 }))
    recordEvent('assistant', 'Sugestão de legenda rejeitada')
  }

  const acceptAllCaptionSuggestions = () => {
    if (!captionSuggestions.length) return
    const accepted = captionSuggestions.map((cue) => ({ ...cue, id: crypto.randomUUID() }))
    setCaptions((items) => [...items, ...accepted].sort((a, b) => a.start - b.start))
    recordEvent('assistant', 'Sugestões de legenda aceitas em lote', `${captionSuggestions.length} sugestões`)
    setReviewStats((stats) => ({ ...stats, captionAccepted: stats.captionAccepted + captionSuggestions.length }))
    setCaptionSuggestions([])
  }

  const rejectAllCaptionSuggestions = () => {
    if (!captionSuggestions.length) return
    recordEvent('assistant', 'Sugestões de legenda rejeitadas em lote', `${captionSuggestions.length} sugestões`)
    setReviewStats((stats) => ({ ...stats, captionRejected: stats.captionRejected + captionSuggestions.length }))
    setCaptionSuggestions([])
  }

  const acceptDescriptionSuggestion = (id: string) => {
    const suggestion = descriptionSuggestions.find((cue) => cue.id === id)
    if (!suggestion) return
    setDescriptions((items) => [...items, {
      id: crypto.randomUUID(), start: suggestion.start, end: suggestion.end,
      text: 'Descrever a informação visual relevante desta cena. [Revisão humana necessária]',
    }].sort((a, b) => a.start - b.start))
    setDescriptionSuggestions((items) => items.filter((cue) => cue.id !== id))
    setReviewStats((stats) => ({ ...stats, descriptionAccepted: stats.descriptionAccepted + 1 }))
    recordEvent('assistant', 'Janela de audiodescrição aceita', formatTimestamp(suggestion.start))
  }

  const rejectDescriptionSuggestion = (id: string) => {
    if (!descriptionSuggestions.some((cue) => cue.id === id)) return
    setDescriptionSuggestions((items) => items.filter((cue) => cue.id !== id))
    setReviewStats((stats) => ({ ...stats, descriptionRejected: stats.descriptionRejected + 1 }))
    recordEvent('assistant', 'Janela de audiodescrição rejeitada')
  }

  const acceptAllDescriptionSuggestions = () => {
    if (!descriptionSuggestions.length) return
    const accepted = descriptionSuggestions.map((cue) => ({
      id: crypto.randomUUID(), start: cue.start, end: cue.end,
      text: 'Descrever a informação visual relevante desta cena. [Revisão humana necessária]',
    }))
    setDescriptions((items) => [...items, ...accepted].sort((a, b) => a.start - b.start))
    recordEvent('assistant', 'Janelas de audiodescrição aceitas em lote', `${descriptionSuggestions.length} sugestões`)
    setReviewStats((stats) => ({ ...stats, descriptionAccepted: stats.descriptionAccepted + descriptionSuggestions.length }))
    setDescriptionSuggestions([])
  }

  const rejectAllDescriptionSuggestions = () => {
    if (!descriptionSuggestions.length) return
    recordEvent('assistant', 'Janelas de audiodescrição rejeitadas em lote', `${descriptionSuggestions.length} sugestões`)
    setReviewStats((stats) => ({ ...stats, descriptionRejected: stats.descriptionRejected + descriptionSuggestions.length }))
    setDescriptionSuggestions([])
  }

  const applyProfile = (nextProfile: AccessibilityProfile) => {
    setProfile(nextProfile)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = profile === 'cognitive' ? 0.85 : 1
    video.muted = profile === 'no-audio' || profile === 'deaf-hard-hearing'
  }, [profile, activeTab, videoUrl])

  const buildSnapshot = (): ProjectSnapshot => ({
    schemaVersion: 4,
    projectName,
    savedAt: new Date().toISOString(),
    media: { name: videoFile?.name ?? null, type: videoFile?.type ?? null, duration },
    captions,
    descriptions,
    chapters,
    simpleTranscript,
    profile,
    evaluation: evaluationSession,
    ai: {
      analysis: analysisReport,
      captionSuggestions,
      descriptionSuggestions,
      reviewStats,
      asrEngine,
      asrLanguage,
      asrModel: 'onnx-community/whisper-tiny',
    },
  })

  const persistProject = async () => {
    try {
      await saveProject(buildSnapshot())
      recordEvent('project', 'Projeto salvo localmente')
      setStatus('Projeto salvo localmente no navegador (IndexedDB). O arquivo de vídeo não é armazenado.')
    } catch {
      setStatus('Não foi possível salvar o projeto no armazenamento local deste navegador.')
    }
  }

  const restoreProject = async () => {
    try {
      const snapshot = await loadProject()
      if (!snapshot) {
        setStatus('Nenhum projeto local salvo foi encontrado.')
        return
      }
      setProjectName(snapshot.projectName)
      setCaptions(snapshot.captions ?? [])
      setDescriptions(snapshot.descriptions ?? [])
      setChapters(snapshot.chapters ?? [])
      setSimpleTranscript(snapshot.simpleTranscript ?? '')
      setProfile(snapshot.profile ?? 'default')
      setAnalysisReport(snapshot.ai?.analysis ?? null)
      setCaptionSuggestions(snapshot.ai?.captionSuggestions ?? [])
      setDescriptionSuggestions(snapshot.ai?.descriptionSuggestions ?? [])
      setReviewStats(snapshot.ai?.reviewStats ?? { captionAccepted: 0, captionRejected: 0, descriptionAccepted: 0, descriptionRejected: 0 })
      setEvaluationSession(snapshot.evaluation ?? newEvaluationSession())
      editedCueIdsRef.current.clear()
      editedChapterIdsRef.current.clear()
      setAsrEngine(snapshot.ai?.asrEngine === 'webgpu' && !webGpuAvailable ? 'wasm' : (snapshot.ai?.asrEngine ?? (webGpuAvailable ? 'webgpu' : 'wasm')))
      setAsrLanguage(snapshot.ai?.asrLanguage ?? 'portuguese')
      audioSamplesRef.current = null
      if (!videoFile) setDuration(snapshot.media?.duration ?? 0)
      setCurrentTime(0)
      setStatus(`Projeto restaurado. Recarregue o vídeo${snapshot.media?.name ? ` “${snapshot.media.name}”` : ''} para continuar a prévia audiovisual.`)
    } catch {
      setStatus('Não foi possível restaurar o projeto local.')
    }
  }

  const buildManifest = () => ({
    format: 'IncluiMedia Accessible Media Package',
    version: '0.4',
    createdAt: new Date().toISOString(),
    project: { name: projectName },
    media: videoFile ? { name: videoFile.name, type: videoFile.type, duration } : { name: null, type: null, duration },
    tracks: {
      captions: { vtt: 'captions.vtt', srt: 'captions.srt', cues: captions.length },
      descriptions: { file: 'descriptions.vtt', cues: descriptions.length },
      chapters: { file: 'chapters.vtt', cues: chapters.length },
      transcript: { file: 'transcript.txt' },
      simplifiedTranscript: { file: 'simple-transcript.txt' },
    },
    accessibilityInspector: {
      heuristicScore: accessibility.score,
      captionTemporalCoveragePercent: Number(accessibility.coverage.toFixed(1)),
      validationIssues: issues.length,
      disclaimer: 'Heuristic authoring indicator; it is not a WCAG conformance certification.',
    },
    aiAssistance: {
      acousticAnalysis: analysisReport?.algorithm ?? null,
      asrModel: 'onnx-community/whisper-tiny',
      asrEngine,
      asrLanguage,
      mediaUploadedForInference: false,
      modelDownloadedOnDemand: true,
      reviewStats,
      pendingSuggestions: captionSuggestions.length + descriptionSuggestions.length,
      humanReviewRequired: true,
    },
    evaluation: {
      report: 'evaluation-report.json',
      baselineCaptured: Boolean(evaluationSession.baseline),
      startedAt: evaluationSession.startedAt,
      note: 'Session metrics and heuristic before/after indicators; not WCAG conformance evidence.',
    },
    recommendedProfiles: Object.keys(profileLabels),
    privacy: 'Media authoring occurs in the browser; video inclusion in export is optional.',
  })

  const exportPackage = async (includeVideo: boolean) => {
    const zip = new JSZip()
    zip.file('captions.vtt', cuesToVtt(captions))
    zip.file('captions.srt', cuesToSrt(captions))
    zip.file('descriptions.vtt', cuesToVtt(descriptions))
    zip.file('chapters.vtt', chaptersToVtt(chapters, duration))
    zip.file('transcript.txt', transcript)
    zip.file('simple-transcript.txt', simpleTranscript)
    zip.file('accessibility-report.json', JSON.stringify({ ...accessibility, issues }, null, 2))
    zip.file('ai-assistance-report.json', JSON.stringify({
      analysis: analysisReport,
      model: 'onnx-community/whisper-tiny',
      engine: asrEngine, language: asrLanguage, reviewStats,
      pendingCaptionSuggestions: captionSuggestions.length,
      pendingDescriptionSuggestions: descriptionSuggestions.length,
      note: 'Audio/video media is not uploaded for inference. Model assets may be downloaded and cached by the browser.',
    }, null, 2))
    zip.file('evaluation-report.json', JSON.stringify(buildEvaluationReport({
      session: evaluationSession, score: accessibility.score, coverage: accessibility.coverage, issues, reviewStats,
      counts: { captions: captions.length, descriptions: descriptions.length, chapters: chapters.length }, duration,
      pendingSuggestions: captionSuggestions.length + descriptionSuggestions.length,
    }), null, 2))
    zip.file('manifest.json', JSON.stringify(buildManifest(), null, 2))
    if (includeVideo && videoFile) zip.file(`media/${videoFile.name}`, videoFile)
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'incluimedia-accessible-package-v0.4.zip')
    recordEvent('export', 'Pacote acessível exportado', includeVideo ? 'com vídeo original' : 'pacote leve')
    setStatus('Pacote acessível v0.4 exportado com sucesso.')
  }

  const exportSrt = () => {
    downloadBlob(new Blob([cuesToSrt(captions)], { type: 'application/x-subrip;charset=utf-8' }), 'captions.srt')
    setStatus('Legendas exportadas em SRT.')
  }

  const generateSimpleDraft = () => {
    const plain = captions
      .map((cue) => cue.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .join('\n')
    setSimpleTranscript(plain)
    incrementCounter('simpleDraftGenerations')
    recordEvent('authoring', 'Rascunho de linguagem simples gerado')
    setStatus('Rascunho estrutural de linguagem simples criado para revisão humana. Nenhum modelo de IA foi utilizado.')
  }

  const captureEvaluationBaseline = () => {
    const baseline = captureBaseline(accessibility.score, accessibility.coverage, issues, { captions: captions.length, descriptions: descriptions.length, chapters: chapters.length })
    const session = newEvaluationSession()
    session.baseline = baseline
    session.events = [{
      at: session.startedAt,
      category: 'evaluation',
      action: 'Linha de base capturada e medição iniciada',
      detail: `score ${baseline.score} · cobertura ${baseline.captionCoveragePercent.toFixed(1)}% · ${baseline.issueCount} ocorrências`,
    }]
    editedCueIdsRef.current.clear()
    editedChapterIdsRef.current.clear()
    setReviewStats({ captionAccepted: 0, captionRejected: 0, descriptionAccepted: 0, descriptionRejected: 0 })
    setEvaluationSession(session)
    setStatus('Linha de base capturada. A janela experimental foi iniciada e os contadores/tempos anteriores foram zerados.')
  }

  const resetEvaluationSession = () => {
    editedCueIdsRef.current.clear()
    editedChapterIdsRef.current.clear()
    setEvaluationSession(newEvaluationSession())
    setReviewStats({ captionAccepted: 0, captionRejected: 0, descriptionAccepted: 0, descriptionRejected: 0 })
    setStatus('Métricas da sessão reiniciadas. O conteúdo atual foi preservado; capture uma nova linha de base quando estiver pronto.')
  }

  const exportEvaluationReport = () => {
    const report = buildEvaluationReport({
      session: evaluationSession, score: accessibility.score, coverage: accessibility.coverage, issues, reviewStats,
      counts: { captions: captions.length, descriptions: descriptions.length, chapters: chapters.length }, duration,
      pendingSuggestions: captionSuggestions.length + descriptionSuggestions.length,
    })
    downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }), 'incluimedia-evaluation-report-v0.4.json')
    recordEvent('export', 'Relatório de avaliação exportado')
    setStatus('Relatório experimental da sessão exportado em JSON.')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, button') || target?.isContentEditable) return
      if (event.code === 'Space' && videoRef.current) {
        event.preventDefault()
        if (videoRef.current.paused) void videoRef.current.play()
        else videoRef.current.pause()
      } else if (event.key.toLowerCase() === 'c' && videoUrl) addCaption()
      else if (event.key.toLowerCase() === 'd' && videoUrl) addDescription()
      else if (event.key.toLowerCase() === 'k' && videoUrl) addChapter()
      else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        seek(currentTime - (event.shiftKey ? 5 : 2))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        seek(currentTime + (event.shiftKey ? 5 : 2))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const stats = [
    ['Legendas', captions.length],
    ['Descrições', descriptions.length],
    ['Capítulos', chapters.length],
  ]

  return (
    <div className={`app profile-${profile}`}>
      <a className="skip-link" href="#workspace">Pular para o conteúdo</a>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">IM</div>
          <div><strong>IncluiMedia Studio</strong><span>Accessible multimedia authoring</span></div>
        </div>
        <div className="top-actions">
          <button className="text-action" onClick={restoreProject}>Restaurar projeto</button>
          <button className="text-action" onClick={persistProject}>Salvar localmente</button>
          <div className="local-badge" title="O vídeo permanece no navegador">● Processamento local</div>
        </div>
      </header>

      <main id="workspace">
        <section className="hero-panel" aria-labelledby="project-title">
          <div>
            <p className="eyebrow">WebMedia 2026 · WFA · v0.4</p>
            <h1 id="project-title">Autoria acessível, assistência local e avaliação mensurável.</h1>
            <p>Crie e revise trilhas acessíveis, use assistência local com Whisper e meça cobertura, esforço de autoria e desempenho before/after — sem enviar o vídeo para um servidor.</p>
            <label className="project-name-label">Nome do projeto<input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label>
          </div>
          <div className="hero-actions">
            <label className="button primary">Carregar vídeo<input className="visually-hidden" type="file" accept="video/*" onChange={loadVideo} /></label>
            <label className="button secondary">Importar VTT/SRT<input className="visually-hidden" type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" onChange={importCaptions} /></label>
          </div>
        </section>

        <div className="status" role="status">{status}</div>

        <nav className="tabs" aria-label="Áreas do estúdio">
          <button className={activeTab === 'author' ? 'active' : ''} onClick={() => setActiveTab('author')}>1. Autoria</button>
          <button className={activeTab === 'assistant' ? 'active' : ''} onClick={() => setActiveTab('assistant')}>2. Assistente local</button>
          <button className={activeTab === 'inspector' ? 'active' : ''} onClick={() => setActiveTab('inspector')}>3. Inspector</button>
          <button className={activeTab === 'evaluation' ? 'active' : ''} onClick={() => setActiveTab('evaluation')}>4. Avaliação</button>
          <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>5. Prévia adaptável</button>
          <button className={activeTab === 'export' ? 'active' : ''} onClick={() => setActiveTab('export')}>6. Exportação</button>
        </nav>

        {activeTab === 'author' && (
          <>
            <section className="studio-grid">
              <div className="player-card card">
                <div className="card-header"><h2>Player de autoria</h2><span>{formatTimestamp(currentTime)} / {formatTimestamp(duration)}</span></div>
                <div className="video-shell">
                  {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} aria-label="Prévia do vídeo em edição" />
                  ) : <div className="video-empty"><strong>Nenhum vídeo carregado</strong><span>O arquivo será aberto somente no navegador.</span></div>}
                  {activeCaption && <div className="caption-overlay" aria-live="polite">{activeCaption.text}</div>}
                </div>
                <div className="quick-actions">
                  <button onClick={addCaption} disabled={!videoUrl}>+ Legenda agora <kbd>C</kbd></button>
                  <button onClick={addDescription} disabled={!videoUrl}>+ Descrição agora <kbd>D</kbd></button>
                  <button onClick={addChapter} disabled={!videoUrl}>+ Capítulo agora <kbd>K</kbd></button>
                </div>
                <div className="track-summary" aria-label="Resumo das trilhas">
                  {stats.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
                </div>
                <details className="shortcut-help"><summary>Atalhos de teclado</summary><p><kbd>Espaço</kbd> reproduzir/pausar · <kbd>C</kbd> legenda · <kbd>D</kbd> descrição · <kbd>K</kbd> capítulo · <kbd>←/→</kbd> ±2 s · <kbd>Shift</kbd> + seta ±5 s.</p></details>
              </div>

              <div className="editor-card card">
                <div className="card-header"><h2>Linha de autoria</h2><span>Human-in-the-loop</span></div>
                <TrackEditor title="Legendas" kind="caption" cues={captions} issues={issues} onSeek={seek} onUpdate={updateCue} onRemove={removeCue} />
                <TrackEditor title="Descrições visuais / marcações de audiodescrição" kind="description" cues={descriptions} issues={issues} onSeek={seek} onUpdate={updateCue} onRemove={removeCue} />
                <div className="track-section">
                  <h3>Capítulos semânticos</h3>
                  {chapters.length === 0 && <p className="empty-copy">Adicione capítulos no tempo atual do player.</p>}
                  {chapters.map((chapter) => (
                    <div className="chapter-row" key={chapter.id}>
                      <button className="time-pill" onClick={() => seek(chapter.start)}>{formatTimestamp(chapter.start)}</button>
                      <input aria-label="Título do capítulo" value={chapter.title} onChange={(e) => updateChapterTitle(chapter.id, e.target.value)} />
                      <button aria-label="Excluir capítulo" onClick={() => removeChapter(chapter.id)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <Timeline duration={duration} currentTime={currentTime} captions={captions} descriptions={descriptions} chapters={chapters} captionSuggestions={captionSuggestions} descriptionSuggestions={descriptionSuggestions} onSeek={seek} />
          </>
        )}

        {activeTab === 'assistant' && (
          <AIAssistant
            videoLoaded={Boolean(videoFile)} analysis={analysisReport} analyzing={analyzing}
            webGpuAvailable={webGpuAvailable} asrEngine={asrEngine} language={asrLanguage}
            asrStatus={asrStatus} asrBusy={asrBusy} asrProgress={asrProgress}
            captionSuggestions={captionSuggestions} descriptionSuggestions={descriptionSuggestions}
            reviewStats={reviewStats} onAnalyze={analyzeAudio} onEngineChange={setAsrEngine}
            onLanguageChange={setAsrLanguage} onTranscribe={runLocalAsr}
            onCreateCaptionPlaceholders={createCaptionPlaceholders} onAcceptCaption={acceptCaptionSuggestion}
            onRejectCaption={rejectCaptionSuggestion} onAcceptAllCaptions={acceptAllCaptionSuggestions}
            onRejectAllCaptions={rejectAllCaptionSuggestions} onAcceptDescription={acceptDescriptionSuggestion}
            onRejectDescription={rejectDescriptionSuggestion} onAcceptAllDescriptions={acceptAllDescriptionSuggestions}
            onRejectAllDescriptions={rejectAllDescriptionSuggestions} onSeek={seek}
          />
        )}

        {activeTab === 'inspector' && (
          <Inspector accessibility={accessibility} issues={issues} onSeek={seek} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationDashboard
            session={evaluationSession} score={accessibility.score} coverage={accessibility.coverage} issues={issues}
            reviewStats={reviewStats} counts={{ captions: captions.length, descriptions: descriptions.length, chapters: chapters.length }}
            duration={duration} pendingSuggestions={captionSuggestions.length + descriptionSuggestions.length}
            busy={analyzing || asrBusy}
            onCaptureBaseline={captureEvaluationBaseline} onResetSession={resetEvaluationSession} onExportReport={exportEvaluationReport}
          />
        )}

        {activeTab === 'preview' && (
          <section className="preview-grid">
            <div className="card">
              <div className="card-header"><h2>Perfil de acessibilidade</h2><span>Adaptação em tempo real</span></div>
              <div className="profile-grid">
                {(Object.keys(profileLabels) as AccessibilityProfile[]).map((key) => (
                  <button key={key} className={profile === key ? 'profile active' : 'profile'} onClick={() => applyProfile(key)} aria-pressed={profile === key}>{profileLabels[key]}</button>
                ))}
              </div>
              <div className="profile-explanation">
                {profile === 'low-vision' && 'Aumenta contraste, texto e controles para favorecer leitura.'}
                {profile === 'deaf-hard-hearing' && 'Prioriza legendas e silencia o áudio na prévia.'}
                {profile === 'cognitive' && 'Reduz a velocidade e prioriza conteúdo textual simplificado.'}
                {profile === 'low-bandwidth' && 'Prioriza transcrição e metadados como alternativa ao vídeo.'}
                {profile === 'no-audio' && 'Mantém o vídeo sem áudio e destaca legendas/transcrição.'}
                {profile === 'default' && 'Apresentação padrão com todas as modalidades disponíveis.'}
              </div>
            </div>

            <div className="card accessible-preview">
              <div className="card-header"><h2>Experiência resultante</h2><span>{profileLabels[profile]}</span></div>
              {videoUrl && profile !== 'low-bandwidth' ? (
                <div className="video-shell preview-video">
                  <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || duration)} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} />
                  {activeCaption && <div className="caption-overlay">{activeCaption.text}</div>}
                </div>
              ) : (
                <div className="bandwidth-alternative"><strong>Modo textual prioritário</strong><p>O conteúdo pode ser consumido pela transcrição, capítulos e descrições sem transferir o vídeo.</p></div>
              )}
              {activeDescription && <aside className="description-live"><strong>Descrição visual:</strong> {activeDescription.text}</aside>}
              <div className="preview-columns">
                <article><h3>Transcrição</h3><pre>{profile === 'cognitive' && simpleTranscript ? simpleTranscript : transcript || 'Importe ou crie legendas para gerar a transcrição.'}</pre></article>
                <article><h3>Navegação</h3>{chapters.length ? chapters.map((chapter) => <button className="chapter-link" key={chapter.id} onClick={() => seek(chapter.start)}>{formatTimestamp(chapter.start)} · {chapter.title}</button>) : <p className="empty-copy">Nenhum capítulo criado.</p>}</article>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'export' && (
          <section className="export-grid">
            <div className="card">
              <div className="card-header"><h2>Transcrição em linguagem simples</h2><span>Revisão humana obrigatória</span></div>
              <p className="muted">A v0.4 mantém o rascunho estrutural local separado do ASR. O Whisper é usado somente para sugerir transcrições temporais. A arquitetura reserva um adaptador para modelos de PLN/LLM em versões posteriores.</p>
              <button className="button secondary inline" onClick={generateSimpleDraft} disabled={!captions.length}>Gerar rascunho local</button>
              <textarea rows={12} value={simpleTranscript} onChange={(e) => setSimpleTranscript(e.target.value)} placeholder="Versão simplificada e revisada do conteúdo..." />
            </div>
            <div className="card package-card">
              <div className="card-header"><h2>Pacote acessível</h2><span>ZIP</span></div>
              <ul>
                <li>captions.vtt / captions.srt — legendas</li>
                <li>descriptions.vtt — descrições visuais</li>
                <li>chapters.vtt — navegação temporal</li>
                <li>transcript.txt — transcrição</li>
                <li>simple-transcript.txt — linguagem simples</li>
                <li>accessibility-report.json — cobertura e validações</li>
                <li>ai-assistance-report.json — análise e revisão HITL</li>
                <li>evaluation-report.json — métricas before/after e desempenho</li>
                <li>manifest.json — metadados e perfis</li>
              </ul>
              <button className="button secondary full" onClick={exportSrt} disabled={!captions.length}>Exportar somente SRT</button>
              <button className="button primary full" onClick={() => exportPackage(false)}>Exportar pacote leve</button>
              <button className="button secondary full" onClick={() => exportPackage(true)} disabled={!videoFile}>Exportar pacote + vídeo original</button>
              <p className="privacy-note">O pacote leve não contém o arquivo de vídeo. O relatório do Inspector é um indicador heurístico de autoria e não uma certificação de conformidade WCAG.</p>
            </div>
          </section>
        )}
      </main>
      <footer>IncluiMedia Studio v0.4.0 · protótipo acadêmico · MIT License</footer>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

type TrackEditorProps = {
  title: string
  kind: 'caption' | 'description'
  cues: TimedCue[]
  issues: ValidationIssue[]
  onSeek: (time: number) => void
  onUpdate: (kind: 'caption' | 'description', id: string, patch: Partial<TimedCue>) => void
  onRemove: (kind: 'caption' | 'description', id: string) => void
}

function TrackEditor({ title, kind, cues, issues, onSeek, onUpdate, onRemove }: TrackEditorProps) {
  const trackKey = kind === 'caption' ? 'captions' : 'descriptions'
  return (
    <div className="track-section">
      <h3>{title}</h3>
      {cues.length === 0 && <p className="empty-copy">Nenhum segmento nesta trilha.</p>}
      {cues.map((cue) => {
        const cueIssues = issues.filter((issue) => issue.track === trackKey && issue.cueId === cue.id)
        return (
          <div className={`cue-block ${cueIssues.some((i) => i.severity === 'error') ? 'has-error' : cueIssues.length ? 'has-warning' : ''}`} key={cue.id}>
            <div className="cue-row">
              <button className="time-pill" onClick={() => onSeek(cue.start)}>{formatTimestamp(cue.start)}</button>
              <label><span>Início</span><input type="number" min="0" step="0.1" value={cue.start} onChange={(e) => onUpdate(kind, cue.id, { start: Number(e.target.value) })} /></label>
              <label><span>Fim</span><input type="number" min="0" step="0.1" value={cue.end} onChange={(e) => onUpdate(kind, cue.id, { end: Number(e.target.value) })} /></label>
              <textarea aria-label={`Texto de ${title}`} rows={2} value={cue.text} onChange={(e) => onUpdate(kind, cue.id, { text: e.target.value })} />
              <button className="delete" aria-label={`Excluir segmento de ${title}`} onClick={() => onRemove(kind, cue.id)}>×</button>
            </div>
            {cueIssues.length > 0 && <div className="inline-issues">{cueIssues.map((issue) => <span key={issue.id} className={`issue-${issue.severity}`}>{severityLabels[issue.severity]}: {issue.message}</span>)}</div>}
          </div>
        )
      })}
    </div>
  )
}

function Inspector({ accessibility, issues, onSeek }: {
  accessibility: ReturnType<typeof accessibilityScore>
  issues: ValidationIssue[]
  onSeek: (time: number) => void
}) {
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  return (
    <section className="inspector-grid">
      <div className="card score-card">
        <div className="card-header"><h2>Accessibility Coverage Inspector</h2><span>Indicador heurístico</span></div>
        <div className="score-ring" style={{ '--score': accessibility.score } as CSSProperties}><strong>{accessibility.score}</strong><span>/ 100</span></div>
        <p className="muted center">Síntese de completude das modalidades de autoria. Não representa certificação WCAG.</p>
        <div className="inspector-kpis"><div><strong>{accessibility.coverage.toFixed(1)}%</strong><span>cobertura temporal de legendas</span></div><div><strong>{errors}</strong><span>erros</span></div><div><strong>{warnings}</strong><span>alertas</span></div></div>
      </div>
      <div className="card coverage-card">
        <div className="card-header"><h2>Modalidades</h2><span>Peso no indicador</span></div>
        <div className="coverage-list">
          {accessibility.components.map((item) => {
            const completion = Math.round(item.value * 100)
            return <div className="coverage-item" key={item.key}><div><strong>{item.label}</strong><span>{item.weight} pts</span></div><div className="coverage-bar"><i style={{ width: `${completion}%` }} /></div><span>{completion}%</span></div>
          })}
        </div>
      </div>
      <div className="card issues-card">
        <div className="card-header"><h2>Validações de autoria</h2><span>{issues.length} ocorrências</span></div>
        {issues.length === 0 ? <div className="clean-state"><strong>Nenhum problema detectado</strong><p>As validações automáticas atuais não encontraram inconsistências temporais ou textuais.</p></div> : (
          <div className="issue-list">
            {issues.map((issue) => <button key={issue.id} className={`issue-row issue-${issue.severity}`} onClick={() => issue.time != null && onSeek(issue.time)}><span className="severity-dot" /><span><strong>{severityLabels[issue.severity]} · {issue.track}</strong><small>{issue.message}</small></span>{issue.time != null && <time>{formatTimestamp(issue.time)}</time>}</button>)}
          </div>
        )}
      </div>
      <aside className="card inspector-note"><h2>O que é medido?</h2><p>O Inspector combina cobertura temporal das legendas com a presença das demais modalidades de autoria e executa checagens de consistência. O objetivo é orientar o autor e tornar a qualidade observável durante a edição.</p><p>Uma avaliação formal de conformidade requer critérios e testes adicionais, inclusive avaliação humana.</p></aside>
    </section>
  )
}

export default App
