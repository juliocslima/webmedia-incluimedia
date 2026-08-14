import type { EvaluationSession, ReviewStats, ValidationIssue } from './types'
import { acceptanceRate, buildEvaluationReport, issueBreakdown, processingFactor } from './metrics'

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s`
}

function signed(value: number, suffix = '') {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(Math.abs(value) < 10 ? 1 : 0)}${suffix}`
}

type Props = {
  session: EvaluationSession
  score: number
  coverage: number
  issues: ValidationIssue[]
  reviewStats: ReviewStats
  counts: { captions: number; descriptions: number; chapters: number }
  duration: number
  pendingSuggestions: number
  busy: boolean
  onCaptureBaseline: () => void
  onResetSession: () => void
  onExportReport: () => void
}

export default function EvaluationDashboard(props: Props) {
  const {
    session, score, coverage, issues, reviewStats, counts, duration, pendingSuggestions, busy,
    onCaptureBaseline, onResetSession, onExportReport,
  } = props
  const baseline = session.baseline
  const currentIssues = issueBreakdown(issues)
  const accepted = reviewStats.captionAccepted + reviewStats.descriptionAccepted
  const rejected = reviewStats.captionRejected + reviewStats.descriptionRejected
  const acceptance = acceptanceRate(reviewStats)
  const totalProcessing = session.timings.audioAnalysisMs + session.timings.asrMs
  const rtf = processingFactor(totalProcessing, duration)
  const report = buildEvaluationReport({ session, score, coverage, issues, reviewStats, counts, duration, pendingSuggestions })

  return (
    <section className="evaluation-workspace">
      <article className="card evaluation-intro">
        <div>
          <p className="eyebrow dark">v0.4 · Evaluation Mode</p>
          <h2>Avaliação da sessão de autoria</h2>
          <p>Capture uma linha de base antes de usar a assistência. A captura inicia a janela experimental, zera as métricas anteriores e o painel passa a comparar o estado inicial com o atual.</p>
        </div>
        <div className="evaluation-actions">
          <button className="button primary inline" onClick={onCaptureBaseline} disabled={busy}>Capturar linha de base</button>
          <button className="button secondary inline" onClick={onExportReport}>Exportar relatório JSON</button>
          <button className="text-button danger-text" onClick={onResetSession} disabled={busy}>Reiniciar métricas da sessão</button>
          {busy && <small className="evaluation-busy-note">Aguarde a análise/inferência atual terminar para alterar a janela experimental.</small>}
        </div>
      </article>

      {!baseline && (
        <div className="baseline-warning" role="status">
          <strong>Linha de base ainda não capturada.</strong>
          <span>Importe ou prepare o estado inicial do conteúdo e capture o “antes” antes de executar a assistência.</span>
        </div>
      )}

      <div className="evaluation-kpi-grid">
        <MetricCard label="Accessibility score" before={baseline?.score} after={score} delta={baseline ? score - baseline.score : undefined} unit=" pts" />
        <MetricCard label="Cobertura de legendas" before={baseline?.captionCoveragePercent} after={coverage} delta={baseline ? coverage - baseline.captionCoveragePercent : undefined} unit="%" />
        <MetricCard label="Problemas detectados" before={baseline?.issueCount} after={currentIssues.total} delta={baseline ? currentIssues.total - baseline.issueCount : undefined} inverse />
        <MetricCard label="Taxa de aceitação IA" after={acceptance} unit="%" helper={`${accepted} aceitas · ${rejected} rejeitadas`} />
      </div>

      <div className="evaluation-grid">
        <article className="card comparison-card">
          <div className="card-header"><h2>Before × After</h2><span>{baseline ? 'comparação ativa' : 'aguardando baseline'}</span></div>
          <ComparisonRow label="Score heurístico" before={baseline?.score} after={score} suffix="/100" />
          <ComparisonRow label="Cobertura temporal" before={baseline?.captionCoveragePercent} after={coverage} suffix="%" />
          <ComparisonRow label="Ocorrências" before={baseline?.issueCount} after={currentIssues.total} />
          <ComparisonRow label="Erros" before={baseline?.errorCount} after={currentIssues.errors} />
          <ComparisonRow label="Alertas" before={baseline?.warningCount} after={currentIssues.warnings} />
          <ComparisonRow label="Legendas" before={baseline?.captionCount} after={counts.captions} />
          <ComparisonRow label="Descrições" before={baseline?.descriptionCount} after={counts.descriptions} />
          <ComparisonRow label="Capítulos" before={baseline?.chapterCount} after={counts.chapters} />
        </article>

        <article className="card processing-card">
          <div className="card-header"><h2>Processamento local</h2><span>instrumentação</span></div>
          <div className="processing-kpis">
            <Kpi value={seconds(session.timings.audioAnalysisMs)} label={`análise acústica · ${session.timings.audioAnalysisRuns} execução(ões)`} />
            <Kpi value={seconds(session.timings.asrMs)} label={`ASR local · ${session.timings.asrRuns} execução(ões)`} />
            <Kpi value={seconds(totalProcessing)} label="processamento acumulado" />
            <Kpi value={`${rtf.toFixed(3)}×`} label="real-time factor (RTF)" />
          </div>
          <p className="metric-note">RTF = tempo acumulado de análise + ASR dividido pela duração do vídeo. Valores abaixo de 1 indicam processamento acumulado inferior ao tempo real do vídeo.</p>
        </article>

        <article className="card authoring-card">
          <div className="card-header"><h2>Esforço de autoria</h2><span>ações registradas</span></div>
          <div className="authoring-stats">
            <Kpi value={session.counters.manualCaptionCreates} label="legendas manuais" />
            <Kpi value={session.counters.manualDescriptionCreates} label="descrições manuais" />
            <Kpi value={session.counters.manualChapterCreates} label="capítulos manuais" />
            <Kpi value={session.counters.manualChapterEdits} label="capítulos revisados" />
            <Kpi value={session.counters.manualChapterDeletes} label="capítulos removidos" />
            <Kpi value={session.counters.manualCueEdits} label="edições em cues" />
            <Kpi value={session.counters.manualCueDeletes} label="remoções" />
            <Kpi value={session.counters.importedCaptionCues} label="cues importados" />
          </div>
        </article>

        <article className="card assistance-card">
          <div className="card-header"><h2>Human-in-the-loop</h2><span>decisões sobre sugestões</span></div>
          <div className="assistance-bars">
            <div><span>Aceitas</span><strong>{accepted}</strong></div>
            <div><span>Rejeitadas</span><strong>{rejected}</strong></div>
            <div><span>Pendentes</span><strong>{pendingSuggestions}</strong></div>
            <div><span>Taxa de aceitação</span><strong>{acceptance.toFixed(1)}%</strong></div>
          </div>
          <p className="metric-note">A taxa considera apenas sugestões já revisadas. Sugestões pendentes não entram no denominador.</p>
        </article>
      </div>

      <article className="card event-log-card">
        <div className="card-header"><h2>Histórico resumido</h2><span>{session.events.length} eventos</span></div>
        {session.events.length === 0 ? <p className="empty-copy">Nenhum evento registrado nesta sessão.</p> : (
          <div className="event-log">
            {[...session.events].reverse().slice(0, 30).map((event, index) => (
              <div className="event-row" key={`${event.at}-${event.action}-${index}`}>
                <time>{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                <span className={`event-category event-${event.category}`}>{event.category}</span>
                <strong>{event.action}</strong>
                <span>{event.detail ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <aside className="card evaluation-note">
        <strong>Uso experimental</strong>
        <p>O relatório registra uma sessão de autoria e indicadores heurísticos. Para estudos com participantes, documente o protocolo, o vídeo, o hardware/navegador e o momento exato da captura da linha de base. Os números não representam certificação WCAG.</p>
        <small>Relatório atual: {report.session.durationSeconds}s de sessão · {report.assistance.reviewed} sugestões revisadas.</small>
      </aside>
    </section>
  )
}

function MetricCard({ label, before, after, delta, unit = '', helper, inverse = false }: {
  label: string; before?: number; after: number; delta?: number; unit?: string; helper?: string; inverse?: boolean
}) {
  const improved = delta == null ? null : inverse ? delta < 0 : delta > 0
  const neutral = delta === 0
  return (
    <article className="card evaluation-kpi">
      <span>{label}</span>
      <strong>{after.toFixed(Number.isInteger(after) ? 0 : 1)}{unit}</strong>
      {before != null && delta != null ? <small className={neutral ? '' : improved ? 'metric-good' : 'metric-bad'}>{signed(delta, unit)} vs. baseline</small> : <small>{helper ?? 'sem baseline'}</small>}
      {helper && before != null && <em>{helper}</em>}
    </article>
  )
}

function ComparisonRow({ label, before, after, suffix = '' }: { label: string; before?: number; after: number; suffix?: string }) {
  const delta = before == null ? null : after - before
  const decimals = suffix === '%' ? 1 : 0
  return (
    <div className="comparison-row">
      <span>{label}</span>
      <strong>{before == null ? '—' : `${before.toFixed(decimals)}${suffix}`}</strong>
      <i aria-hidden="true">→</i>
      <strong>{`${after.toFixed(decimals)}${suffix}`}</strong>
      <small>{delta == null ? 'capture o baseline' : signed(delta, suffix)}</small>
    </div>
  )
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return <div className="evaluation-mini-kpi"><strong>{value}</strong><span>{label}</span></div>
}
