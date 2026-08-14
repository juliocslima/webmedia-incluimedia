# IncluiMedia Studio v0.3 — funcionalidades

## Objetivo

Adicionar assistência automática à autoria sem substituir a decisão humana e sem enviar o vídeo para um serviço de inferência.

## Implementado

- análise acústica local;
- segmentação de fala por pausas;
- detecção de janelas candidatas para audiodescrição;
- Whisper Tiny no navegador;
- WebGPU/WASM;
- Web Worker para ASR;
- idiomas: auto, português, inglês e espanhol;
- sugestões de legendas separadas das trilhas definitivas;
- sugestões de janelas de audiodescrição;
- aceite/rejeição individual e em lote;
- métricas HITL;
- sugestões pendentes na timeline;
- persistência IndexedDB de estado da assistência;
- relatório `ai-assistance-report.json`;
- manifesto v0.3.

## Decisão importante

A detecção de pausa **não é apresentada como geração automática de audiodescrição**. Ela apenas sugere uma janela temporal em que uma audiodescrição pode ser inserida. O autor continua responsável por inspecionar a cena e escrever a descrição adequada.

## Propriedade de privacidade

- mídia: local;
- análise acústica: local;
- ASR: local;
- modelo: baixado sob demanda;
- backend: não necessário.
