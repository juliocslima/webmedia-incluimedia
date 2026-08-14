# Plano de implementação — WFA/WebMedia 2026

## P0 — demonstração

- [x] carregar vídeo local;
- [x] importar WebVTT/SRT;
- [x] editar trilhas temporais;
- [x] timeline multimodal;
- [x] Accessibility Coverage Inspector;
- [x] perfis adaptativos;
- [x] IndexedDB;
- [x] análise acústica local;
- [x] segmentação automática de fala;
- [x] detecção de pausas candidatas para audiodescrição;
- [x] ASR Whisper local no navegador;
- [x] revisão human-in-the-loop;
- [x] métricas de aceite/rejeição;
- [x] exportação do relatório de assistência;
- [ ] testar ASR com vídeo real de 60–120 s no ambiente da apresentação;
- [ ] medir tempo de carregamento do modelo em WebGPU e WASM;
- [ ] capturar figuras finais para o artigo;
- [ ] gravar vídeo de demonstração.

## P1 — fortalecimento experimental

- [ ] medir WER/CER em pequeno conjunto de vídeos em português;
- [ ] medir precisão/recall da segmentação de fala em amostra anotada;
- [ ] medir taxa de aceite das sugestões;
- [ ] medir tempo economizado versus autoria manual;
- [ ] registrar hardware/browser nos experimentos.

## P2 — evolução pós-submissão

- [ ] análise visual local de cenas;
- [ ] sugestão semântica de descrição visual;
- [ ] simplificação textual com modelo local;
- [ ] waveform detalhada;
- [ ] colaboração/versionamento opcional;
- [ ] avaliação com autores de conteúdo e usuários.
