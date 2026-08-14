# IncluiMedia Studio v0.4.0

**IncluiMedia Studio** é uma ferramenta web de autoria integrada para transformar vídeos convencionais em experiências multimídia acessíveis e adaptáveis. O protótipo foi concebido para demonstração no **Workshop de Ferramentas e Aplicações (WFA) do WebMedia 2026**.

## Destaques da v0.4

A v0.4 adiciona um **modo de avaliação instrumentado** sobre o fluxo local e human-in-the-loop da v0.3:

- captura explícita de linha de base (*before*);
- comparação before/after de score, cobertura, problemas e recursos de acessibilidade;
- tempo acumulado de análise acústica e ASR;
- Real-Time Factor (RTF) em relação à duração do vídeo;
- contadores de ações manuais de autoria;
- taxa de aceitação das sugestões revisadas;
- histórico resumido da sessão;
- persistência dessas métricas no projeto local;
- exportação de `evaluation-report.json` no pacote e de relatório JSON independente.

A linha de base é capturada pelo autor no momento adequado para evitar comparar artificialmente todo experimento com um projeto vazio. A captura também inicia a janela experimental e zera métricas anteriores, mantendo intacto o conteúdo que compõe o estado “before”.

## Recursos de assistência local herdados da v0.3

A v0.3 introduziu o fluxo de **autoria assistida local e human-in-the-loop**:

- análise acústica do vídeo no navegador;
- detecção adaptativa de pausas por energia RMS;
- sugestão de trechos temporais prováveis de fala;
- identificação de pausas candidatas para inserção de audiodescrição;
- ASR com **Whisper Tiny + Transformers.js**, executado em WebGPU ou CPU/WASM;
- transcrição por trechos previamente segmentados para preservar intervalos temporais conhecidos;
- aceite/rejeição individual ou em lote das sugestões;
- separação visual entre sugestões e trilhas definitivas na timeline;
- métricas de revisão human-in-the-loop;
- `ai-assistance-report.json` incluído no pacote exportado;
- persistência das sugestões e métricas no IndexedDB.

A análise acústica **não interpreta a imagem**. Uma pausa candidata para audiodescrição é apenas uma janela temporal potencialmente útil; o conteúdo visual precisa ser verificado e redigido pelo autor.

## Funcionalidades acumuladas

- carregamento local de vídeo com `URL.createObjectURL()`;
- importação e edição de legendas WebVTT/SRT;
- criação de descrições visuais e marcações para audiodescrição;
- criação de capítulos semânticos;
- timeline multimodal clicável;
- Accessibility Coverage Inspector;
- validações de intervalos, sobreposição, duração, texto vazio e velocidade de leitura;
- persistência local em IndexedDB;
- geração de transcrição textual a partir das legendas aceitas;
- rascunho estrutural de linguagem simples para revisão humana;
- perfis adaptativos: padrão, baixa visão, deficiência auditiva, apoio cognitivo, baixa conectividade e ambiente sem áudio;
- exportação de pacote ZIP interoperável, com ou sem o vídeo original.

## Privacidade e processamento local

O vídeo e o áudio permanecem no navegador durante a autoria e a inferência. Para o ASR, os **arquivos do modelo** são baixados sob demanda do repositório configurado e podem ser armazenados no cache do navegador. O arquivo de mídia não é enviado para o serviço que hospeda o modelo.

Assim, a arquitetura diferencia:

1. **dados de mídia do usuário** — processados localmente;
2. **artefatos do modelo** — baixados quando necessários;
3. **metadados/anotações** — persistidos localmente no IndexedDB quando o usuário salva o projeto.

## Assistente local

### Etapa 1 — análise acústica

O navegador decodifica o áudio e converte-o para mono/16 kHz. A análise usa janelas de 100 ms e um limiar RMS adaptativo derivado do próprio sinal. Pausas mínimas são consolidadas e usadas para formar:

- blocos de fala candidatos;
- janelas candidatas para audiodescrição.

Trechos de fala muito longos são divididos antes do ASR para manter inferências menores e temporalmente controladas.

### Etapa 2 — Whisper local

O autor pode escolher:

- **WebGPU** — quando suportado pelo navegador/dispositivo;
- **CPU/WASM** — fallback mais compatível.

O modelo atual é `onnx-community/whisper-tiny`, multilíngue. A interface oferece português, inglês, espanhol ou detecção automática.

### Etapa 3 — revisão humana

Resultados automáticos ficam em uma fila de sugestões. Eles só entram em `captions` ou `descriptions` após aceite explícito. O relatório registra quantas sugestões foram aceitas, rejeitadas e permaneceram pendentes.

## Evaluation Mode

O painel de avaliação registra o estado inicial escolhido pelo autor e o compara ao estado corrente. As métricas incluem:

- score heurístico before/after;
- cobertura temporal de legendas before/after;
- erros, alertas e ocorrências before/after;
- quantidade de legendas, descrições e capítulos;
- tempo de análise acústica e ASR;
- RTF = `(tempo de análise + tempo de ASR) / duração do vídeo`;
- ações manuais de criação, edição, remoção e importação;
- decisões human-in-the-loop e taxa de aceitação;
- histórico de até 200 eventos recentes.

O relatório pode ser exportado isoladamente como `incluimedia-evaluation-report-v0.4.json` e também faz parte do pacote acessível como `evaluation-report.json`.

## Accessibility Coverage Inspector

O Inspector continua sendo **apoio à autoria**, não certificação de conformidade. O indicador combina:

- cobertura temporal das legendas — 35 pontos;
- existência de transcrição — 20 pontos;
- existência de descrições visuais — 20 pontos;
- existência de capítulos — 15 pontos;
- existência de versão textual simplificada — 10 pontos.

## Executar localmente

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Executar com Docker

```bash
docker compose up --build
```

Abra `http://localhost:8080`.

> A primeira execução do Whisper pode exigir download dos arquivos do modelo e, portanto, conexão com a Internet. Inferências posteriores podem aproveitar o cache do navegador.

## Fluxo de demonstração recomendado

1. carregar vídeo local;
2. importar recursos preexistentes, se houver;
3. abrir **Avaliação** e capturar a linha de base;
4. abrir **Assistente local**;
5. executar análise acústica;
6. mostrar trechos de fala e janelas candidatas para audiodescrição;
7. executar Whisper local;
8. aceitar uma legenda e rejeitar outra;
9. aceitar uma janela de audiodescrição e editar o texto na Autoria;
10. abrir o Inspector e corrigir um alerta;
11. voltar à **Avaliação** e mostrar os deltas, tempos, RTF e taxa HITL;
12. exportar o relatório experimental;
13. selecionar um perfil adaptativo;
14. exportar o pacote acessível.

## Pacote exportado

- `captions.vtt`
- `captions.srt`
- `descriptions.vtt`
- `chapters.vtt`
- `transcript.txt`
- `simple-transcript.txt`
- `accessibility-report.json`
- `ai-assistance-report.json`
- `evaluation-report.json`
- `manifest.json`
- opcionalmente `media/<video-original>`

## Limitações atuais

- a detecção de audiodescrição é baseada em **pausas acústicas**, não em entendimento visual da cena;
- a qualidade do ASR depende do idioma, ruído, hardware e duração dos trechos;
- alguns formatos/Codecs de vídeo podem não ser decodificados pela Web Audio API do navegador;
- o indicador de acessibilidade é heurístico e não substitui avaliação de conformidade;
- o rascunho de linguagem simples ainda não usa modelo semântico.

## Licença

MIT.
