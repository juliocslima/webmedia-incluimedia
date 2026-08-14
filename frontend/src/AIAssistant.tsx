import type { AudioAnalysisReport, ReviewStats, TimedCue } from './types'
import { formatTimestamp } from './vtt'

type Props = {
  videoLoaded: boolean
  analysis: AudioAnalysisReport | null
  analyzing: boolean
  webGpuAvailable: boolean
  asrEngine: 'webgpu' | 'wasm'
  language: string
  asrStatus: string
  asrBusy: boolean
  asrProgress: number
  captionSuggestions: TimedCue[]
  descriptionSuggestions: TimedCue[]
  reviewStats: ReviewStats
  onAnalyze: () => void
  onEngineChange: (engine: 'webgpu' | 'wasm') => void
  onLanguageChange: (language: string) => void
  onTranscribe: () => void
  onCreateCaptionPlaceholders: () => void
  onAcceptCaption: (id: string) => void
  onRejectCaption: (id: string) => void
  onAcceptAllCaptions: () => void
  onRejectAllCaptions: () => void
  onAcceptDescription: (id: string) => void
  onRejectDescription: (id: string) => void
  onAcceptAllDescriptions: () => void
  onRejectAllDescriptions: () => void
  onSeek: (time: number) => void
}

export default function AIAssistant(props: Props) {
  const {
    videoLoaded, analysis, analyzing, webGpuAvailable, asrEngine, language, asrStatus, asrBusy, asrProgress,
    captionSuggestions, descriptionSuggestions, reviewStats, onAnalyze, onEngineChange, onLanguageChange,
    onTranscribe, onCreateCaptionPlaceholders, onAcceptCaption, onRejectCaption, onAcceptAllCaptions,
    onRejectAllCaptions, onAcceptDescription, onRejectDescription, onAcceptAllDescriptions,
    onRejectAllDescriptions, onSeek,
  } = props

  return (
    <section className="ai-workspace">
      <div className="ai-intro card">
        <div>
          <p className="eyebrow dark">Assistente local · Human-in-the-loop</p>
          <h2>Sugestões automáticas, decisão humana.</h2>
          <p>O áudio é analisado no navegador para localizar fala e pausas. As sugestões somente entram nas trilhas definitivas depois de aceitas pelo autor.</p>
        </div>
        <div className="privacy-stack">
          <span><strong>Vídeo/áudio</strong> não enviado</span>
          <span><strong>Inferência ASR</strong> no dispositivo</span>
          <span><strong>Modelo</strong> baixado sob demanda</span>
        </div>
      </div>

      <div className="ai-grid">
        <article className="card">
          <div className="card-header"><h2>1. Análise acústica local</h2><span>RMS adaptativo</span></div>
          <p className="muted">Detecta pausas e blocos prováveis de fala sem usar IA generativa nem enviar mídia para a rede.</p>
          <button className="button primary inline" onClick={onAnalyze} disabled={!videoLoaded || analyzing}>{analyzing ? 'Analisando áudio…' : analysis ? 'Reanalisar áudio' : 'Analisar áudio'}</button>
          {!analysis && <p className="empty-copy">Carregue um vídeo e execute a análise para gerar candidatos temporais.</p>}
          {analysis && (
            <div className="analysis-kpis">
              <Kpi value={analysis.speechSegments.length} label="trechos de fala" />
              <Kpi value={analysis.pauses.length} label="pausas detectadas" />
              <Kpi value={analysis.descriptionCandidates.length} label="janelas de AD" />
              <Kpi value={`${analysis.silenceThreshold.toFixed(3)}`} label="limiar RMS" />
            </div>
          )}
          {analysis && (
            <details className="technical-details"><summary>Parâmetros da análise</summary>
              <p>Amostragem de análise: {analysis.analysisSampleRate / 1000} kHz · janela: {analysis.windowMs} ms · piso de ruído: {analysis.noiseFloorDb.toFixed(1)} dBFS · referência de fala: {analysis.speechReferenceDb.toFixed(1)} dBFS.</p>
            </details>
          )}
        </article>

        <article className="card">
          <div className="card-header"><h2>2. Whisper local</h2><span>Transformers.js</span></div>
          <p className="muted">O modelo Whisper Tiny é baixado na primeira execução e a inferência ocorre no navegador. O download do modelo requer conexão; o áudio não é enviado ao provedor do modelo.</p>
          <div className="ai-settings">
            <label>Execução<select value={asrEngine} onChange={(e) => onEngineChange(e.target.value as 'webgpu' | 'wasm')}>
              <option value="webgpu" disabled={!webGpuAvailable}>WebGPU{!webGpuAvailable ? ' — indisponível' : ''}</option>
              <option value="wasm">CPU / WASM</option>
            </select></label>
            <label>Idioma<select value={language} onChange={(e) => onLanguageChange(e.target.value)}>
              <option value="auto">Detecção automática</option><option value="portuguese">Português</option><option value="english">English</option><option value="spanish">Español</option>
            </select></label>
          </div>
          <button className="button primary inline" onClick={onTranscribe} disabled={!analysis?.speechSegments.length || asrBusy}>{asrBusy ? 'Transcrevendo localmente…' : 'Gerar sugestões de legenda'}</button>
          <div className="asr-status"><span>{asrStatus}</span>{asrBusy && <progress max="100" value={asrProgress} />}</div>
          {analysis && !captionSuggestions.length && <button className="text-button" onClick={onCreateCaptionPlaceholders}>Usar apenas a segmentação e criar placeholders</button>}
        </article>
      </div>

      <div className="review-grid">
        <SuggestionCard title="Sugestões de legenda" subtitle="ASR ou segmentação acústica" suggestions={captionSuggestions} empty="Nenhuma sugestão de legenda pendente." onSeek={onSeek} onAccept={onAcceptCaption} onReject={onRejectCaption} onAcceptAll={onAcceptAllCaptions} onRejectAll={onRejectAllCaptions} />
        <SuggestionCard title="Janelas candidatas para audiodescrição" subtitle="Pausas acústicas ≥ 1,25 s" suggestions={descriptionSuggestions} empty="Nenhuma janela candidata pendente." onSeek={onSeek} onAccept={onAcceptDescription} onReject={onRejectDescription} onAcceptAll={onAcceptAllDescriptions} onRejectAll={onRejectAllDescriptions} />
      </div>

      <aside className="review-metrics card">
        <div><strong>{reviewStats.captionAccepted + reviewStats.descriptionAccepted}</strong><span>sugestões aceitas</span></div>
        <div><strong>{reviewStats.captionRejected + reviewStats.descriptionRejected}</strong><span>sugestões rejeitadas</span></div>
        <div><strong>{captionSuggestions.length + descriptionSuggestions.length}</strong><span>pendentes</span></div>
        <p>Essas métricas ficam registradas no relatório exportado para apoiar avaliação do fluxo human-in-the-loop.</p>
      </aside>
    </section>
  )
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>
}

function SuggestionCard({ title, subtitle, suggestions, empty, onSeek, onAccept, onReject, onAcceptAll, onRejectAll }: {
  title: string
  subtitle: string
  suggestions: TimedCue[]
  empty: string
  onSeek: (time: number) => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
}) {
  return (
    <article className="card suggestion-card">
      <div className="card-header"><h2>{title}</h2><span>{subtitle}</span></div>
      {suggestions.length > 0 && <div className="bulk-actions"><button onClick={onAcceptAll}>Aceitar todas</button><button onClick={onRejectAll}>Rejeitar todas</button></div>}
      {suggestions.length === 0 && <p className="empty-copy">{empty}</p>}
      <div className="suggestion-list">
        {suggestions.map((cue) => (
          <div className="suggestion-row" key={cue.id}>
            <button className="time-pill" onClick={() => onSeek(cue.start)}>{formatTimestamp(cue.start)} → {formatTimestamp(cue.end)}</button>
            <p>{cue.text || 'Segmento detectado — texto ainda não gerado.'}</p>
            <div><button className="accept" onClick={() => onAccept(cue.id)}>Aceitar</button><button className="reject" onClick={() => onReject(cue.id)}>Rejeitar</button></div>
          </div>
        ))}
      </div>
    </article>
  )
}
