# IncluiMedia Studio v0.4.0

**IncluiMedia Studio** é uma ferramenta web de autoria multimídia que reúne recursos para transformar vídeos convencionais em experiências **acessíveis e adaptáveis**, com ênfase no processamento local da mídia e na revisão humana das sugestões automatizadas (*human-in-the-loop*, HITL).

Esta versão corresponde ao protótipo descrito no artigo **“IncluiMedia Studio: Autoria Web com Preservação de Privacidade para Experiências de Vídeo Acessíveis e Adaptáveis”**, aceito no **Workshop de Ferramentas e Aplicações (WFA) do WebMedia 2026**.

**DOI do artefato:** [10.5281/zenodo.23000029](https://doi.org/10.5281/zenodo.23000029).

**Licença:** MIT. Consulte o arquivo `LICENSE` incluído na distribuição do código-fonte.

> **Escopo dos resultados científicos:** a avaliação descrita no artigo demonstra um fluxo instrumentado de autoria e enriquecimento de trilhas; **não** demonstra conformidade com as WCAG, efetividade da acessibilidade para usuários finais ou desempenho do reconhecimento automático de fala (ASR). Nas três sessões relatadas, a inferência do Whisper não foi concluída.

## 1. Recursos da versão 0.4.0

A v0.4 introduz o **modo de avaliação instrumentado** sobre o fluxo de autoria local da v0.3:

- captura explícita de linha de base (*before*) no momento selecionado pelo autor;
- comparação *before/after* do indicador heurístico, cobertura temporal de legendas, ocorrências de validação e presença de recursos de acessibilidade;
- registro do tempo acumulado de análise acústica e das tentativas de ASR;
- cálculo do *Real-Time Factor* (RTF), quando aplicável e com dados válidos;
- contagem de ações manuais de criação, edição, remoção e importação;
- registro de decisões HITL e taxa de aceitação das sugestões efetivamente revisadas;
- histórico resumido da sessão, limitado aos 200 eventos mais recentes;
- persistência das métricas no projeto local;
- exportação de relatório independente (`incluimedia-evaluation-report-v0.4.json`) e inclusão de `evaluation-report.json` no pacote exportado.

A captura da linha de base **não apaga as trilhas existentes**: ela registra o estado corrente e inicia a janela de medição, zerando os contadores experimentais anteriores. Assim, experimentos com trilhas previamente preparadas não são confundidos com autoria a partir de um projeto vazio.

## 2. Assistência local e revisão humana

Introduzido na v0.3 e preservado nesta versão, o **Assistente Local** integra análise acústica e uma opção experimental de reconhecimento automático de fala (ASR):

- decodificação e análise de áudio no próprio navegador;
- detecção adaptativa de pausas com base na energia *Root Mean Square* (RMS);
- identificação de segmentos candidatos de fala e janelas temporais potencialmente adequadas para audiodescrição;
- integração experimental com **Whisper Tiny + Transformers.js**, com alternativas de execução **WebGPU** e **CPU/WebAssembly (WASM)** conforme compatibilidade do ambiente;
- transcrição por trechos temporais previamente segmentados;
- fila de sugestões com aceitação e rejeição individual ou em lote;
- distinção visual entre sugestões e trilhas definitivas na linha do tempo;
- registro de decisões humanas e geração de `ai-assistance-report.json`;
- persistência local de sugestões e métricas no **IndexedDB**.

**Importante:** a análise acústica não interpreta o conteúdo visual da cena. Uma pausa detectada é apenas uma **janela candidata**; cabe ao autor decidir se há informação visual relevante a descrever e elaborar ou revisar a audiodescrição.

### 2.1 Análise acústica

O áudio é decodificado no navegador, convertido para mono e reamostrado para **16 kHz**. A energia RMS é calculada em janelas de **100 ms**; um limiar adaptativo, derivado do próprio sinal, auxilia a identificar pausas de pelo menos **0,55 s**. Pausas internas de pelo menos **1,25 s** podem ser apresentadas como janelas candidatas de audiodescrição. Os segmentos de fala podem ser divididos antes da inferência para limitar o tamanho dos trechos processados.

Esses parâmetros caracterizam o protótipo relatado no artigo; podem precisar de ajuste para outros tipos de áudio.

### 2.2 Reconhecimento automático de fala (experimental)

O modelo indicado nesta versão é `onnx-community/whisper-tiny` (multilíngue), integrado via **Transformers.js**. A interface prevê português, inglês, espanhol e detecção automática, com execução por WebGPU quando disponível ou CPU/WASM em ambientes compatíveis.

A disponibilidade de ambas as opções **não garante fallback automático nem funcionamento universal**. Na avaliação relatada no artigo, a sessão com WASM falhou na criação da sessão ONNX e as duas tentativas com WebGPU não encontraram adaptador compatível. Por isso, **não há resultado validado de precisão, latência ou RTF de ASR** nessas sessões. Se o ASR não funcionar no seu ambiente, continue com a análise acústica e a edição/importação manual das legendas; registre a falha no relatório experimental.

### 2.3 Aprovação das sugestões

Os resultados computacionais permanecem em uma fila de sugestões. Eles só são incorporados às trilhas de legendas ou descrições após **aceitação explícita** pelo autor. A ferramenta registra quantas sugestões foram aceitas, rejeitadas, editadas ou permaneceram pendentes, conforme o fluxo utilizado.

## 3. Funcionalidades de autoria e adaptação

- abertura de vídeo local por `URL.createObjectURL()`, sem transferência da mídia para um servidor de inferência;
- importação e edição de legendas **WebVTT/SRT**;
- autoria de descrições visuais e marcações de audiodescrição;
- autoria de capítulos semânticos e navegação por linha do tempo multimodal;
- **Accessibility Coverage Inspector** com inspeção de intervalos inválidos, sobreposições, texto vazio, duração excessiva e velocidade de leitura;
- geração de transcrição textual a partir das legendas aceitas;
- geração de rascunho estrutural de texto simplificado, sujeito a revisão humana;
- persistência das anotações e do estado do projeto em **IndexedDB**;
- perfis de visualização: padrão, baixa visão, deficiência auditiva, apoio cognitivo, baixa conectividade e ambiente sem áudio;
- prévia adaptável e exportação de pacote ZIP interoperável, opcionalmente sem incluir o vídeo original.

A interface está organizada funcionalmente nas áreas **Autoria**, **Assistente Local**, **Inspetor**, **Avaliação**, **Prévia Adaptável** e **Exportação**.

## 4. Privacidade e requisitos de conectividade

O IncluiMedia Studio segue um modelo de **processamento local da mídia**:

| Categoria | Tratamento |
| --- | --- |
| Vídeo e áudio do usuário | Abertos e processados localmente no navegador; não são enviados ao serviço que hospeda os modelos para executar a inferência. |
| Artefatos do modelo de ASR | Podem ser baixados sob demanda a partir do repositório configurado e armazenados em cache pelo navegador. |
| Trilhas, anotações e métricas | Podem ser salvas localmente no IndexedDB, sem persistir o vídeo original nesse armazenamento. |
| Arquivos exportados | Gerados localmente e salvos pelo usuário; o vídeo original pode ser omitido do ZIP. |

**Processamento local não significa operação inteiramente offline.** A instalação da aplicação e o primeiro carregamento do modelo podem exigir conexão com a Internet. A disponibilidade posterior sem rede depende do cache, do navegador e das dependências previamente instaladas. Este projeto **não oferece garantia geral de confidencialidade** para extensões do navegador, dispositivos comprometidos ou recursos de terceiros não auditados.

## 5. Executar localmente

### Pré-requisitos

- Node.js e npm compatíveis com as versões declaradas pelo código distribuído (consulte `frontend/package.json` e eventual arquivo de versão do projeto);
- navegador moderno com suporte às APIs Web utilizadas;
- opcionalmente, navegador/dispositivo com suporte a WebGPU para testar a via de inferência acelerada.

A partir da raiz do código-fonte:

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço mostrado pelo servidor de desenvolvimento; na configuração padrão apresentada para o protótipo, é **http://localhost:5173**. Caso essa porta esteja ocupada ou a configuração tenha sido alterada, use o endereço informado pelo terminal.

### Executar com Docker

Com Docker e Docker Compose disponíveis, a partir da pasta que contém `docker-compose.yml` ou `compose.yaml`:

```bash
docker compose up --build
```

Na configuração documentada para o protótipo, abra **http://localhost:8080**. Confirme o mapeamento de portas no arquivo Compose incluído no artefato.

> **Nota de reprodutibilidade:** esses comandos pressupõem que o depósito contenha o diretório `frontend` e a configuração Compose correspondente. Antes de publicar, execute ambos os procedimentos usando exclusivamente o ZIP que será depositado.

## 6. Demonstração sugerida

1. Abra um vídeo armazenado localmente.
2. Importe recursos existentes, se houver, e confira as trilhas na linha do tempo.
3. No painel **Avaliação**, capture explicitamente a linha de base (*before*).
4. No **Assistente Local**, execute a análise acústica.
5. Inspecione os segmentos candidatos de fala e as pausas candidatas de audiodescrição.
6. **Opcional:** tente executar o Whisper e registre o resultado ou a falha de compatibilidade.
7. Revise uma sugestão de legenda; aceite ou rejeite conforme o conteúdo.
8. Avalie uma pausa candidata e, somente quando pertinente, redija ou edite uma descrição visual.
9. No **Inspetor**, corrija uma ocorrência objetiva de autoria.
10. Retorne à **Avaliação** e examine diferenças entre os estados inicial e corrente, tempos e decisões HITL.
11. Exporte o relatório experimental.
12. Explore a **Prévia Adaptável** e exporte o pacote acessível.

A demonstração pode ser realizada sem ASR; nesse caso, não apresente tentativas interrompidas como inferências concluídas.

## 7. Modo de avaliação e interpretação das métricas

O painel compara o estado de referência capturado pelo autor com o estado corrente do projeto. Entre as métricas disponíveis estão:

- **Indicador heurístico** antes/depois;
- **cobertura temporal de legendas** antes/depois;
- quantidade de erros, alertas e outras ocorrências de validação;
- quantidades de legendas, descrições e capítulos;
- tempo de análise acústica e tempo de tentativas de ASR;
- ações manuais registradas, decisões HITL e taxa de aceitação;
- histórico de até **200 eventos** recentes.

A relação geral do RTF é:

```text
RTF = tempo total de processamento / duração da mídia analisada
```

O relatório da ferramenta considera os tempos registrados de análise acústica e ASR. **Tempos de tentativas de ASR que falharam não constituem medidas válidas de desempenho de reconhecimento** e devem ser identificados separadamente na interpretação experimental.

**Arquivos de relatório:** `incluimedia-evaluation-report-v0.4.json` (exportação independente) e `evaluation-report.json` (pacote ZIP).

### 7.1 Limites da avaliação relatada no artigo

A avaliação original reuniu **três sessões demonstrativas**, executadas por um dos autores, com vídeos em português de **127,1 s, 157,8 s e 148,6 s**. As linhas de base já incluíam legendas e, em um caso, capítulos preparados. Portanto, os resultados caracterizam **enriquecimento e correção de trilhas preexistentes**, e não autoria integral a partir de vídeos sem anotações. A avaliação não incluiu participantes externos nem pessoas com deficiência e não permite inferir usabilidade ou efetividade da acessibilidade para usuários finais.

## 8. Accessibility Coverage Inspector

O **Inspetor** apoia a revisão editorial e identifica inconsistências técnicas, mas **não certifica conformidade** com as Diretrizes de Acessibilidade para Conteúdo Web (WCAG) nem substitui avaliação especializada com usuários.

O indicador de completude, deliberadamente heurístico, distribui até **100 pontos** entre:

| Componente | Pontuação máxima |
| --- | ---: |
| Cobertura temporal das legendas | 35 |
| Existência de transcrição | 20 |
| Existência de descrições visuais | 20 |
| Existência de capítulos | 15 |
| Existência de texto simplificado | 10 |
| **Total** | **100** |

Uma pontuação maior representa maior preenchimento desses critérios internos, **não** qualidade semântica comprovada, adequação da audiodescrição ou atendimento automático às WCAG.

## 9. Estrutura do pacote exportado

A exportação acessível pode incluir:

```text
captions.vtt
captions.srt
descriptions.vtt
chapters.vtt
transcript.txt
simple-transcript.txt
accessibility-report.json
ai-assistance-report.json
evaluation-report.json
manifest.json
media/<video-original>        # opcional, conforme escolha do usuário
```

Os arquivos exportados refletem as trilhas e opções disponíveis no projeto; não se deve presumir que todas as modalidades estejam preenchidas em todos os pacotes.

## 10. Limitações conhecidas e trabalhos futuros

- A sugestão de janelas de audiodescrição é **acústica** e não identifica semanticamente elementos visuais relevantes.
- A execução experimental do Whisper depende de navegador, hardware, backend e compatibilidade do modelo; **não foi concluída** nas três sessões originais. É prioritário aprimorar o fallback entre WebGPU e WASM e validá-lo experimentalmente.
- Idioma, ruído e segmentação podem influenciar a qualidade da transcrição quando o ASR estiver operacional.
- Certos formatos e codecs podem não ser decodificados pelas APIs de mídia do navegador.
- O rascunho de texto simplificado é estrutural e exige revisão; não representa simplificação semântica validada.
- O indicador do Inspetor mede completude e consistência técnica interna, **não** efetividade da acessibilidade nem conformidade normativa.
- É necessária avaliação futura com criadores de conteúdo e pessoas com diferentes necessidades de acessibilidade, incluindo medidas de usabilidade, tempo, erros e utilidade percebida.

## 11. Citação e identificação da versão

**Artefato:** IncluiMedia Studio, versão 0.4.0. **DOI reservado:** [10.5281/zenodo.23000029](https://doi.org/10.5281/zenodo.23000029).

Após a publicação do depósito, use preferencialmente a opção **Cite as** do Zenodo para obter a referência bibliográfica com a lista definitiva de autores, data de publicação e DOI. Não confunda o DOI reservado desta versão com um eventual DOI conceitual usado para reunir versões futuras.

**Artigo associado:** “IncluiMedia Studio: Autoria Web com Preservação de Privacidade para Experiências de Vídeo Acessíveis e Adaptáveis”, WFA / WebMedia 2026. Acrescente a referência bibliográfica definitiva após a publicação nos anais.

## 12. Licença

Distribuído sob a licença **MIT**. O depósito do código-fonte deve incluir o texto integral da licença no arquivo `LICENSE`, com a identificação de titulares e ano aplicáveis. A licença do software não substitui os direitos e permissões relativos a vídeos importados pelo usuário, modelos externos e demais dependências de terceiros.