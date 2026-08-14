# Protocolo de avaliação sugerido — v0.4

Este protocolo é um ponto de partida para demonstrações e estudos exploratórios do IncluiMedia Studio. Ele não substitui um desenho experimental formal nem aprovação ética quando aplicável.

## Unidade de análise

Uma sessão de autoria sobre um único vídeo. Recomenda-se registrar externamente:

- identificador do vídeo e duração;
- idioma e características do áudio;
- navegador e versão;
- sistema operacional;
- CPU/GPU e memória;
- engine do ASR (WebGPU ou WASM);
- estado do cache do modelo (primeiro carregamento ou modelo já disponível).

## Procedimento

1. Abrir/reiniciar o projeto.
2. Carregar o vídeo.
3. Importar recursos que pertençam legitimamente ao estado inicial.
4. Capturar a **linha de base** no painel Avaliação. Essa ação inicia a janela experimental e zera métricas anteriores.
5. Executar as operações previstas no cenário: análise acústica, ASR, revisão de sugestões e edição manual.
6. Encerrar a intervenção quando o critério do experimento for atingido.
7. Exportar o relatório de avaliação antes de iniciar outra sessão.

## Métricas

### Accessibility score
Indicador heurístico de completude de modalidades. Usado apenas para comparação interna da autoria; não representa conformidade WCAG.

### Caption temporal coverage
Percentual da duração do vídeo coberto por intervalos de legenda válidos, com união de intervalos sobrepostos.

### Validation issues
Quantidade de ocorrências encontradas pelo Inspector, separadas em erros, alertas e informações.

### Acceptance rate

`accepted / (accepted + rejected) × 100`

Sugestões pendentes não entram no denominador.

### Processing time
Tempo de parede medido no navegador para análise acústica e ASR. O tempo do ASR inclui carregamento/preparação associado à execução medida.

### Real-Time Factor (RTF)

`(audioAnalysisMs + asrMs) / 1000 / videoDurationSeconds`

RTF < 1 indica tempo acumulado de processamento inferior à duração do vídeo. Comparações entre máquinas devem informar hardware, navegador, engine e estado do cache.

### Authoring counters
Contadores de criações manuais, cues revisados, remoções, capítulos, importações e geração do rascunho estrutural de linguagem simples. Edições de texto em um mesmo cue são contadas uma vez por cue na sessão para reduzir viés por quantidade de teclas pressionadas.

## Interpretação

A linha de base deve corresponder ao estado real que se deseja melhorar. Se o estudo partir de um vídeo já legendado parcialmente, essas legendas devem existir antes da captura do baseline. Se o estudo partir de um vídeo sem recursos, o baseline pode ser vazio.
