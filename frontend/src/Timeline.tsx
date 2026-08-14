import type { CSSProperties, MouseEvent } from 'react'
import type { Chapter, TimedCue } from './types'
import { formatTimestamp } from './vtt'

type Props = {
  duration: number
  currentTime: number
  captions: TimedCue[]
  descriptions: TimedCue[]
  chapters: Chapter[]
  captionSuggestions?: TimedCue[]
  descriptionSuggestions?: TimedCue[]
  onSeek: (time: number) => void
}

function percent(value: number, duration: number) {
  if (!duration) return 0
  return Math.max(0, Math.min(100, (value / duration) * 100))
}

export default function Timeline({ duration, currentTime, captions, descriptions, chapters, captionSuggestions = [], descriptionSuggestions = [], onSeek }: Props) {
  const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  const hasSuggestions = captionSuggestions.length > 0 || descriptionSuggestions.length > 0

  return (
    <section className="timeline-card card" aria-label="Timeline multimodal">
      <div className="card-header">
        <h2>Timeline multimodal</h2>
        <span>{formatTimestamp(currentTime)} · clique para navegar</span>
      </div>
      <div className="timeline" onClick={seekFromPointer} role="slider" aria-label="Navegar no tempo" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} tabIndex={0}>
        <div className="timeline-ruler">
          {[0, .25, .5, .75, 1].map((ratio) => <span key={ratio} style={{ left: `${ratio * 100}%` }}>{formatTimestamp((duration || 0) * ratio).slice(3, 8)}</span>)}
        </div>
        <TrackRow label="Legendas" className="caption-track" cues={captions} duration={duration} />
        <TrackRow label="Descrições" className="description-track" cues={descriptions} duration={duration} />
        {hasSuggestions && <SuggestionRow captionSuggestions={captionSuggestions} descriptionSuggestions={descriptionSuggestions} duration={duration} />}
        <div className="timeline-row">
          <span className="timeline-label">Capítulos</span>
          <div className="timeline-lane">
            {chapters.map((chapter) => <span key={chapter.id} className="chapter-marker" style={{ left: `${percent(chapter.start, duration)}%` }} title={`${formatTimestamp(chapter.start)} · ${chapter.title}`} />)}
          </div>
        </div>
        <div className="playhead" style={{ '--playhead': duration ? currentTime / duration : 0 } as CSSProperties} aria-hidden="true" />
      </div>
      <div className="timeline-legend"><span><i className="legend-caption" /> Legendas</span><span><i className="legend-description" /> Descrições</span>{hasSuggestions && <span><i className="legend-ai" /> Sugestões pendentes</span>}<span><i className="legend-chapter" /> Capítulos</span></div>
    </section>
  )
}

function TrackRow({ label, className, cues, duration }: { label: string; className: string; cues: TimedCue[]; duration: number }) {
  return (
    <div className="timeline-row">
      <span className="timeline-label">{label}</span>
      <div className="timeline-lane">
        {cues.map((cue) => {
          const left = percent(cue.start, duration)
          const width = Math.max(.6, percent(cue.end - cue.start, duration))
          return <span key={cue.id} className={`timeline-segment ${className}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${formatTimestamp(cue.start)} → ${formatTimestamp(cue.end)} · ${cue.text}`} />
        })}
      </div>
    </div>
  )
}

function SuggestionRow({ captionSuggestions, descriptionSuggestions, duration }: { captionSuggestions: TimedCue[]; descriptionSuggestions: TimedCue[]; duration: number }) {
  return (
    <div className="timeline-row ai-row">
      <span className="timeline-label">Sugestões</span>
      <div className="timeline-lane">
        {captionSuggestions.map((cue) => <Suggestion cue={cue} duration={duration} className="ai-caption-track" key={cue.id} />)}
        {descriptionSuggestions.map((cue) => <Suggestion cue={cue} duration={duration} className="ai-description-track" key={cue.id} />)}
      </div>
    </div>
  )
}

function Suggestion({ cue, duration, className }: { cue: TimedCue; duration: number; className: string }) {
  const left = percent(cue.start, duration)
  const width = Math.max(.6, percent(cue.end - cue.start, duration))
  return <span className={`timeline-segment ai-track ${className}`} style={{ left: `${left}%`, width: `${width}%` }} title={`Sugestão · ${formatTimestamp(cue.start)} → ${formatTimestamp(cue.end)} · ${cue.text}`} />
}
