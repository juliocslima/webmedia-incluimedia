/// <reference lib="webworker" />
import { pipeline } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/whisper-tiny'
const SAMPLE_RATE = 16_000
let cachedKey = ''
let transcriberPromise: Promise<any> | null = null

async function getTranscriber(engine: 'webgpu' | 'wasm') {
  const key = `${MODEL_ID}:${engine}`
  if (!transcriberPromise || cachedKey !== key) {
    cachedKey = key
    const options: Record<string, unknown> = {
      progress_callback: (event: any) => self.postMessage({ status: 'model-progress', event: { status: event?.status, file: event?.file, progress: event?.progress, loaded: event?.loaded, total: event?.total } }),
    }
    if (engine === 'webgpu') options.device = 'webgpu'
    else options.dtype = 'q8'
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL_ID, options as any).catch((error) => {
      transcriberPromise = null
      cachedKey = ''
      throw error
    })
  }
  return transcriberPromise
}

self.addEventListener('message', async (event: MessageEvent) => {
  if (event.data?.type !== 'transcribe') return
  const { audio, segments, engine, language } = event.data as {
    audio: Float32Array
    segments: Array<{ id: string; start: number; end: number }>
    engine: 'webgpu' | 'wasm'
    language: string
  }
  try {
    self.postMessage({ status: 'loading-model', model: MODEL_ID, engine })
    const transcriber = await getTranscriber(engine)
    self.postMessage({ status: 'model-ready', model: MODEL_ID, engine })

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      const startIndex = Math.max(0, Math.floor(segment.start * SAMPLE_RATE))
      const endIndex = Math.min(audio.length, Math.ceil(segment.end * SAMPLE_RATE))
      const slice = audio.slice(startIndex, endIndex)
      self.postMessage({ status: 'segment-start', index, total: segments.length, segment })
      const generationOptions: Record<string, unknown> = { task: 'transcribe' }
      if (language !== 'auto') generationOptions.language = language
      const output = await transcriber(slice, generationOptions as any)
      const text = String(output?.text ?? '').trim()
      self.postMessage({ status: 'segment-result', index, total: segments.length, segment, text })
    }
    self.postMessage({ status: 'complete', total: segments.length, model: MODEL_ID, engine })
  } catch (error) {
    self.postMessage({ status: 'error', message: error instanceof Error ? error.message : String(error) })
  }
})
