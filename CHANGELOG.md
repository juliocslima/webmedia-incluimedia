# Changelog

## 0.4.0

- adiciona modo de avaliação instrumentado;
- adiciona captura explícita de linha de base before;
- adiciona comparação before/after de score, cobertura, problemas e recursos;
- mede tempos de análise acústica e ASR local;
- calcula Real-Time Factor (RTF);
- adiciona contadores de ações manuais de autoria;
- adiciona taxa de aceitação das decisões human-in-the-loop;
- adiciona histórico resumido da sessão;
- persiste métricas no snapshot IndexedDB;
- adiciona exportação independente do relatório experimental;
- adiciona `evaluation-report.json` ao pacote exportado;
- atualiza snapshot e manifesto para v0.4.

## 0.3.0

- adiciona análise acústica local com limiar RMS adaptativo;
- adiciona segmentação temporal automática de fala;
- adiciona detecção de pausas candidatas para audiodescrição;
- adiciona ASR local com Whisper Tiny e Transformers.js;
- adiciona execução WebGPU ou CPU/WASM;
- move inferência para Web Worker;
- adiciona fila human-in-the-loop com aceite/rejeição;
- adiciona métricas de revisão e sugestões pendentes na timeline;
- adiciona `ai-assistance-report.json`;
- atualiza snapshots e manifesto para v0.3.

## 0.2.0

- adiciona timeline multimodal sincronizada;
- adiciona Accessibility Coverage Inspector;
- adiciona validações temporais e textuais;
- adiciona importação/exportação SRT;
- adiciona persistência de projeto em IndexedDB;
- adiciona atalhos de teclado;
- adiciona `accessibility-report.json` ao pacote;
- atualiza manifesto do pacote para a versão 0.2;
- adiciona roteiro de demonstração e exemplo SRT.

## 0.1.1

- corrige declarações de assets CSS para build TypeScript/Vite.

## 0.1.0

- MVP inicial de autoria multimodal local-first.
