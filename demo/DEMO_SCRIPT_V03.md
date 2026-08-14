# Roteiro de demonstração — IncluiMedia Studio v0.3

Duração sugerida: 4–5 minutos.

## 1. Contexto — 20 s

Apresentar o problema: produzir um vídeo acessível exige coordenar várias modalidades e normalmente envolve ferramentas separadas.

## 2. Vídeo local — 20 s

Carregar um vídeo curto e destacar o indicador de processamento local.

## 3. Análise acústica — 40 s

Abrir **Assistente local** e executar **Analisar áudio**.

Mostrar:

- trechos de fala;
- pausas;
- janelas candidatas para audiodescrição;
- parâmetros adaptativos do sinal.

Enfatizar que uma janela de pausa não é uma audiodescrição pronta.

## 4. Whisper local — 60–90 s

Selecionar WebGPU quando disponível e português. Executar a geração de sugestões de legenda.

Explicar:

- o modelo é baixado sob demanda;
- a inferência ocorre no dispositivo;
- os segmentos vêm da análise temporal anterior;
- o resultado não entra automaticamente na versão final.

## 5. Human-in-the-loop — 45 s

Aceitar uma sugestão de legenda, rejeitar outra e aceitar uma janela de audiodescrição.

Voltar para **Autoria** e mostrar:

- legenda aceita como cue normal;
- marcação de audiodescrição para edição humana;
- sugestões ainda pendentes em estilo tracejado na timeline.

## 6. Inspector e perfil — 40 s

Abrir o Inspector e mostrar alteração na cobertura. Depois selecionar um perfil de acessibilidade na prévia.

## 7. Exportação — 30 s

Exportar pacote leve e destacar:

- WebVTT/SRT;
- transcrição;
- relatório de acessibilidade;
- relatório de assistência IA/HITL;
- manifesto;
- ausência do vídeo no pacote leve.

## Mensagem final

O diferencial não é simplesmente transcrever: é integrar autoria multimodal, sugestões locais, revisão humana, inspeção de qualidade e adaptação da apresentação em um fluxo web único.
