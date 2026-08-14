# IncluiMedia Studio v0.4 — Evaluation Mode

A v0.4 transforma o protótipo em uma ferramenta instrumentada para demonstrações e estudos controlados de autoria acessível.

## Principais recursos

- captura explícita de linha de base (*before*);
- comparação before/after do score heurístico, cobertura temporal, problemas e quantidade de recursos acessíveis;
- métricas de análise acústica e ASR local;
- Real-Time Factor (RTF) = tempo acumulado de análise + ASR / duração do vídeo;
- contadores de ações manuais de autoria;
- métricas de revisão human-in-the-loop (aceitas, rejeitadas, pendentes, taxa de aceitação);
- histórico resumido de até 200 eventos da sessão;
- persistência das métricas no snapshot IndexedDB;
- exportação independente de `incluimedia-evaluation-report-v0.4.json`;
- inclusão de `evaluation-report.json` no pacote multimídia acessível.

## Procedimento recomendado de avaliação

1. Carregar o vídeo.
2. Importar recursos preexistentes, se houver.
3. Abrir **Avaliação** e capturar a linha de base.
4. Executar análise acústica e/ou ASR local.
5. Revisar sugestões, aceitando ou rejeitando cada uma.
6. Fazer correções manuais necessárias.
7. Voltar ao painel **Avaliação** e observar o estado final.
8. Exportar o relatório JSON.

A linha de base é explícita para evitar assumir que todo experimento começa com um projeto vazio. Ao capturá-la, os contadores, tempos e decisões anteriores são zerados e a medição da intervenção começa naquele instante.

## Interpretação

O score do Accessibility Coverage Inspector é heurístico e serve para apoiar autoria e comparação interna. Ele não representa certificação WCAG. Para estudos científicos, devem ser registrados protocolo, hardware, navegador, vídeo, duração e condições da sessão.
