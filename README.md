# VIDEO FACTORY

Fábrica de vídeos verticais com Remotion, React e TypeScript. A primeira composição, **GTA6Promo**, tem 1080 × 1920, 30 fps e 600 quadros (20 segundos).

## Prévia e exportação

Requer Node.js 22.18 ou superior, npm e Git para atualizar as skills.

```bash
npm ci
npm run check
npm run studio
npm run render
```

Abra **GTA6Promo** no Remotion Studio em `http://localhost:3000/GTA6Promo` se a porta 3000 estiver livre. Edite `presets/gta6-promo.json` para que o Studio recarregue a prévia com suas alterações. O painel **Render → Input Props** permite ajustar as propriedades de uma exportação pelo Studio. A exportação padrão fica em `out/GTA6Promo.mp4`.

Por padrão, o Remotion baixa o Chrome Headless Shell. Se a rede bloquear o download e o sistema já tiver Chromium, informe o executável, ajustando o caminho conforme a máquina.

```bash
REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium npm run render
```

A variável `REMOTION_PRIVATE_LICENSE_KEY` é encaminhada ao Remotion quando configurada.

## Criar com presets

Duplique `presets/gta6-promo.json` ou comece com `presets/teaser-curto.json`. A composição recalcula a duração toda vez que o preset muda.

| Campo | Uso |
| --- | --- |
| `scenes[].lines` | Uma entrada por linha do título. Use linhas curtas para maximizar a legibilidade. |
| `scenes[].durationInFrames` | Duração da cena em quadros. A 30 fps, 30 quadros equivalem a um segundo. |
| `scenes[].animation` | `rise`, `impact`, `slide` ou `fade`. |
| `scenes[].palette` | `dusk`, `heat`, `violet` ou `signal`. |
| `scenes[].eyebrow` | Linha de apoio opcional acima do título. |
| `scenes[].media` | Mídia opcional. Use um objeto com `kind` igual a `image` ou `video` e `src` relativo a `public/`. Inclua clipes com duração suficiente para a cena. O áudio do clipe fica mudo. |
| `branding` | Cabeçalho opcional com `name` e `label`. |
| `audio` | Objeto opcional com `volume` de 0 a 1, `cue` para o impacto por cena e/ou `bed` para a base em loop. Ambos os caminhos são relativos a `public/`. |

```bash
npm run render -- presets/teaser-curto.json out/TeaserCurto.mp4
npm run batch -- presets/batch.example.json
```

O manifesto de lote lista pares `preset` e `output`. Os caminhos são relativos ao próprio manifesto. A execução valida todos os presets e referências de mídia antes de iniciar. Reutiliza o bundle e o navegador, processa os jobs em sequência e só publica cada MP4 depois que a renderização daquele job termina. Em caso de erro de renderização, encerra o lote com código diferente de zero e preserva os jobs já concluídos. Saídas existentes com o mesmo nome são substituídas após o render bem-sucedido.

## Mídia do primeiro vídeo

A paisagem ilustrativa, a base sonora e os impactos foram criados para este projeto. A paisagem está identificada na imagem como **ARTE ILUSTRATIVA ORIGINAL**. Os arquivos finais estão em `public/` e o script opcional `scripts/generate-original-assets.py` permite regenerá-los com Python, Pillow e NumPy. Execute-o na raiz do projeto. As fontes OFL Barlow Condensed e IBM Plex Mono são instaladas com o npm via Fontsource. Para um novo vídeo, inclua em `public/` apenas mídia própria ou que você tem autorização para usar.

As 13 Remotion Agent Skills oficiais foram instaladas em `.agents/skills/` a partir do repositório `remotion-dev/skills`, revisão `3e20ac75161bc34468845df714701cc9bf6075f4`.

## Arquitetura e evolução

- `src/spec.ts` concentra o contrato de entrada, a validação, o formato e o cálculo da timeline.
- `src/Root.tsx` registra a composição editável no Studio e calcula a duração com as propriedades atuais.
- `src/Video.tsx`, `src/animation.ts` e `src/video.css` separam a timeline, a apresentação, as animações e o layout.
- `presets/` contém as configurações de vídeo e o manifesto de lote. `scripts/render.mjs` é a entrada de automação. `tests/` cobre o roteiro, recálculo de duração e validação de mídia.

Um futuro gerador por prompt pode produzir presets e submetê-los ao mesmo esquema antes de enfileirar. Um serviço de ingestão de lives pode detectar trechos, exportar cortes autorizados e preencher a mídia e a duração de cada cena. Uma futura faixa de legendas pode receber palavras com timestamps vindas de um transcritor. Narração pode entrar como uma faixa dedicada com sincronização por cena, e imagens/vídeos gerados podem alimentar `scenes[].media`. Um dashboard pode editar presets, registrar jobs, acompanhar o progresso e oferecer as saídas. Essas integrações ainda precisam de implementação, armazenamento e configuração de provedores.

## Dashboard web

O Next.js serve três páginas estáticas: Dashboard, Biblioteca e Criar vídeo. A biblioteca usa `web/catalog.ts`. Para incluir um novo vídeo, coloque o MP4 e o pôster em `public/videos/` e acrescente a entrada ao catálogo. A prévia Remotion é carregada sob demanda e reutiliza a composição e o preset originais. Os arquivos em `out/` continuam sendo as saídas locais do render.

```bash
npm ci
npm run check
npm run build
npm start
```

Na Vercel, importe a raiz deste repositório como projeto Next.js. Os comandos de instalação e build estão em `vercel.json`. Esta versão funciona sem variáveis de ambiente. Os MP4 são estáticos, com suporte a requisições de intervalo para reprodução e cabeçalho de download quando solicitado. A mídia inicial fica no próprio repositório. Para uma biblioteca grande, migre o catálogo para armazenamento de objetos que suporte streaming por intervalo e download.

### Geração por prompt

A área Criar vídeo aceita os parâmetros no formulário, mantém o botão de geração desativado e mostra o estado do serviço. Para ativá-la, implemente um endpoint autenticado que converta o prompt em um preset validado e crie um job. Processe os jobs em um worker de Remotion com navegador e FFmpeg. Para oferecer 16:9 e 1:1, estenda também o metadado e verifique os layouts nessas proporções. Persista o histórico e os status dos jobs, envie as saídas para armazenamento de objetos e habilite a submissão quando o backend estiver operacional.
