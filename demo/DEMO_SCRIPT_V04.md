# Roteiro de demonstração — IncluiMedia Studio v0.4

1. Carregar uma videoaula curta.
2. Mostrar que o vídeo permanece local no navegador.
3. Importar uma legenda parcial em VTT/SRT.
4. Abrir **Avaliação** e capturar a linha de base.
5. Mostrar score, cobertura e problemas no estado inicial.
6. Abrir **Assistente local** e executar análise acústica.
7. Executar Whisper local (WASM ou WebGPU).
8. Aceitar algumas sugestões, rejeitar uma e revisar manualmente outra.
9. Aceitar/rejeitar uma janela candidata para audiodescrição.
10. Voltar ao **Inspector** e corrigir um alerta.
11. Abrir **Avaliação** e mostrar:
    - score before/after;
    - cobertura before/after;
    - problemas before/after;
    - taxa de aceitação de sugestões;
    - tempo de análise e ASR;
    - RTF;
    - ações manuais;
    - histórico da sessão.
12. Exportar `incluimedia-evaluation-report-v0.4.json`.
13. Exportar o pacote acessível, destacando `evaluation-report.json`.
