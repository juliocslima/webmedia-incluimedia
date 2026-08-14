# IncluiMedia Studio v0.2 — escopo funcional

## 1. Timeline multimodal

A timeline representa três trilhas sincronizadas: legendas, descrições visuais e capítulos. Os segmentos são posicionados proporcionalmente à duração do vídeo e o playhead acompanha o tempo corrente. O usuário pode clicar em qualquer posição da timeline para navegar.

## 2. Accessibility Coverage Inspector

O Inspector introduz uma camada de feedback durante a autoria. A ferramenta calcula um indicador heurístico de 0 a 100 e apresenta seus componentes separadamente. A cobertura de legendas é temporal e considera a união dos intervalos, evitando contabilizar sobreposições em duplicidade.

### Validações atuais

- texto vazio;
- fim menor ou igual ao início;
- cue fora da duração do vídeo;
- segmentos excessivamente longos;
- sobreposição entre cues consecutivos;
- velocidade de leitura de legendas acima de 20 caracteres/s;
- capítulos vazios, duplicados ou fora da duração;
- ausência de legendas;
- ausência de capítulos em vídeos com mais de 60 segundos.

O Inspector não declara conformidade WCAG. Seu papel é tornar aspectos mensuráveis da autoria visíveis e acionáveis.

## 3. Interoperabilidade VTT/SRT

A v0.2 importa legendas `.vtt` e `.srt`, mantém uma representação temporal interna comum e exporta ambos os formatos. Descrições e capítulos permanecem exportados em WebVTT.

## 4. Persistência local

A aplicação armazena o projeto corrente em IndexedDB. O snapshot contém trilhas, perfil, nome do projeto, transcrição simplificada e metadados do vídeo. O arquivo audiovisual não é persistido.

## 5. Atalhos para demonstração

- Espaço: play/pause;
- C: legenda;
- D: descrição;
- K: capítulo;
- setas: navegação temporal.

## 6. Exportação

O pacote ZIP contém artefatos multimodais, manifesto e `accessibility-report.json`, permitindo demonstrar não apenas autoria, mas também rastreabilidade do estado de acessibilidade produzido pela ferramenta.
