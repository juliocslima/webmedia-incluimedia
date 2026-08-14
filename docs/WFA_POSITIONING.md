# Posicionamento para o WFA / WebMedia 2026

## Contribuição central

IncluiMedia Studio não é proposto como um simples gerador de legendas. Sua contribuição é uma **interface de autoria multimodal orientada a acessibilidade**, na qual legendas, descrições visuais, capítulos, transcrição, linguagem simples e perfis de apresentação são tratados como partes sincronizadas do mesmo artefato multimídia.

## Diferenciais demonstráveis

1. **Autoria integrada:** múltiplas modalidades temporais em um único fluxo.
2. **Adaptação por perfil:** a mesma mídia é apresentada de maneiras diferentes conforme necessidades de acesso e contexto de uso.
3. **Privacy by design:** vídeo processado localmente no navegador no MVP.
4. **Accessibility Coverage Inspector:** feedback heurístico e acionável durante a autoria, com cobertura temporal, validações e relatório exportável.
5. **Timeline multimodal:** visualização sincronizada de legendas, descrições e capítulos em uma mesma linha temporal.
6. **Pacote interoperável:** exportação baseada em WebVTT/SRT + manifesto e relatório JSON.
7. **Human-in-the-loop implementado:** ASR e janelas candidatas de audiodescrição permanecem em uma fila separada até aceite/rejeição explícitos.
8. **ASR local:** Whisper executado no navegador com WebGPU/WASM, após segmentação acústica temporal.

## Alinhamento com tópicos do WebMedia

- Acessibilidade e Tecnologias Assistivas
- Adaptação e Personalização de Conteúdo
- Autoria e Anotação de Conteúdo
- Experiência do Usuário e QoE
- Interação Multimodal
- Processamento de Linguagem Natural
- Recursos de Aprendizagem
- Segurança e Privacidade
- Sincronização e Apresentação Multimídia

## Roteiro de demonstração de 4–5 minutos

1. Abrir uma videoaula curta localmente.
2. Executar análise acústica e mostrar trechos de fala/pausas.
3. Executar Whisper local e gerar sugestões temporais de legenda.
4. Aceitar/rejeitar sugestões e mostrar as métricas HITL.
5. Aceitar uma janela candidata de audiodescrição e editar o texto na autoria.
6. Abrir o Accessibility Coverage Inspector e mostrar score, cobertura temporal e validações.
7. Alternar entre perfis de baixa visão, deficiência auditiva e baixa conectividade.
8. Exportar o pacote ZIP e abrir `manifest.json`, `accessibility-report.json` e `ai-assistance-report.json`.

## Hipótese de avaliação para evolução do trabalho

Uma avaliação inicial pode investigar (i) tempo de autoria manual versus assistida, (ii) taxa de aceite/rejeição das sugestões, (iii) qualidade do ASR em português, (iv) precisão temporal da segmentação acústica e (v) percepção de controle do autor no fluxo human-in-the-loop.
