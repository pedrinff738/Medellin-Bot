# Medellin Farmes Bot - Modal em 2 Etapas

## Nova atualização

Sistema de 2 logs adicionado:

- **Logs 1:** envio de registros de farmes.
- **Logs 2:** registros aprovados/reprovados.
- O canal antigo `1510042021228970014` ficou como Logs 1.
- Para Logs 2, coloque o ID do novo canal no `.env` em `LOGS_ANALISE_CHANNEL_ID`.

O formulário foi dividido em 2 etapas:

### Modal 1
- 👤 Nome
- 🆔 ID
- 📅 Data
- 🕒 Horário

Depois aparece o botão **➡️ Próximo**.

### Modal 2
- 📦 Quantidade
- 🖼️ URL da Imagem

## Mantém também

- Motivo da Reprovação obrigatório.
- Reação na mensagem de logs:
  - ✅ Aprovado
  - ❌ Reprovado
- Ranking semanal e mensal Top-5.
- Logs e DMs automáticas.

## Como atualizar

1. Extraia o ZIP.
2. Copie seu `.env` antigo para esta nova pasta.
3. Rode:

```bash
npm install
npm start
```


## Configuração do segundo canal de logs

No arquivo `.env`, acrescente:

```env
LOGS_ANALISE_CHANNEL_ID=ID_DO_CANAL_DE_APROVADOS_E_REPROVADOS
```

Se você não preencher, o bot usará o mesmo canal dos envios.


## Painel de Ranking

Nova função adicionada:

```txt
/painel_ranking
```

Esse comando envia um painel com dois botões:

- 📅 Ranking Semanal
- 🏆 Ranking Mensal

Ao clicar em um botão, o jogador vê o ranking específico com:

- Posição
- Usuário
- Farme Entregue
- Horário de atualização


## Correção dos 2 canais de logs

Agora os logs ficam separados assim:

```env
LOGS_ANALISE_CHANNEL_ID=ID_DO_CANAL_DE_REGISTROS_ENVIADOS
LOGS_ANALISE_APROVADOS_REPROVADOS=ID_DO_CANAL_DE_APROVADOS_REPROVADOS
```

- `LOGS_ANALISE_CHANNEL_ID` recebe somente registros enviados.
- `LOGS_ANALISE_APROVADOS_REPROVADOS` recebe somente farmes aprovados/reprovados.

Importante: o bot precisa ter permissão nos dois canais:
- Ver Canal
- Enviar Mensagens
- Incorporar Links
- Anexar Arquivos
- Ler Histórico de Mensagens
- Adicionar Reações


## Correção do Painel de Ranking

Agora o comando:

```txt
/painel_ranking
```

envia o painel de ranking no **mesmo canal onde o comando foi usado**.


## Correção de reação nos logs

Agora o bot funciona assim:

- Logs 1 (`LOGS_ANALISE_CHANNEL_ID`): recebe somente o envio do registro.
- Logs 2 (`LOGS_ANALISE_APROVADOS_REPROVADOS`): recebe aprovados/reprovados.
- A reação ✅ ou ❌ é adicionada na própria mensagem enviada no Logs 2.
- O bot não reage mais na mensagem do Logs 1.


## Sistema de Escalação

Novo comando:

```txt
/escalacao acao:<nome da ação> horario:<horário> vagas:<quantidade>
```

Exemplo:

```txt
/escalacao acao:Banco Central horario:22:00 vagas:8
```

O bot envia um painel com botões:

- ✅ Entrar
- 🚪 Sair
- 🔒 Encerrar

Apenas membros com o cargo de liderança/gerência conseguem abrir e encerrar escalações.


## Escalação Avançada

O comando `/escalacao` agora usa o modelo completo:

- 👤 Nome da Ação
- 🔫 Armamento
- 📅 Data
- 🕒 Horário
- 📝 Descrição
- 👥 Participantes
- 🏁 Resultado
- 💰 Valor Arrecadado

Botões:

- ✅ Entrar na Equipe
- ❌ Sair da Equipe
- 🏁 Ação Concluída
- ⚙️ Gerenciar

Exemplo:

```txt
/escalacao acao:Operação Medellin armamento:AK-47, FAL, Pistola .50 data:29/05/2026 horario:22:00 vagas:15 descricao:Ação planejada para organização da equipe.
```


## Correção da Escalação Avançada

- Corrigido erro de sintaxe no `join`.
- `/escalacao` só pode ser usado no canal `1510080509374632017`.
- Logs de ações vão para o canal `1510084948806336552`.
- Ao concluir/gerenciar, o bot atualiza a mensagem da escalação e registra nos logs de ação.

Adicione ao `.env`:

```env
ESCALACAO_CHANNEL_ID=1510080509374632017
LOGS_ACAO_CHANNEL_ID=1510084948806336552
```


## Correção v2

- Corrigido erro de sintaxe em `.setDescription`.
- Corrigidas quebras de linha inválidas dentro de strings JavaScript.


## Atualização - Valor Arrecadado na Escalação

O comando `/escalacao` agora possui o campo opcional:

```txt
valor_arrecadado
```

Exemplo:

```txt
/escalacao acao:Nióbio armamento:Sub data:29/05/2026 horario:22:00 vagas:15 valor_arrecadado:R$ 125.750 descricao:Todos comparecer na quadra!
```

Também foi ajustado o update dos botões Entrar/Sair para reduzir o erro "Esta interação falhou".


## Correção v4.5.0

- Removido do painel o texto: `Escalação: ID • Hoje às...`
- Botões **Entrar na Equipe** e **Sair da Equipe** ajustados para responderem imediatamente.
- Mantido o campo `valor_arrecadado` no comando `/escalacao`.


## Correção v4.5.1

- Corrigido erro `DiscordAPIError[10062]: Unknown interaction` no comando `/escalacao`.
- O bot agora usa `deferReply()` imediatamente e depois `editReply()`.
- Mantido o footer removido do painel de escalação.


## Correção v4.6.0

- Participantes da escalação agora aparecem um abaixo do outro.
- Botão **Sair da Equipe** responde imediatamente com `deferUpdate()`.
- Reduzido delay/bug dos botões Entrar/Sair.


## Atualização v4.7.0 - Interface da Escalação

- Painel de escalação reorganizado para ficar mais próximo do modelo enviado.
- Campos em blocos separados:
  - Nome da Ação
  - Armamento
  - Data
  - Horário
  - Descrição
  - Participantes
  - Resultado
  - Valor Arrecadado
- Botões mantidos:
  - Entrar na Equipe
  - Sair da Equipe
  - Ação Concluída
  - Gerenciar

Observação: embeds do Discord não permitem criar cards visuais exatamente iguais à imagem, mas esta versão aproxima o layout mantendo as funções.


## Atualização v4.8.0 - Gerente Ação, Winner/Red

Novidades:

- Painel de escalação agora mostra:
  - 👤 Resp. Pela Ação
- Botão **Ação Concluída** agora só funciona para o cargo:
  - `GERENTE_ACAO_ROLE_ID`
- Resultado aceito:
  - `Winner`
  - `Red`
- O resultado aparece no painel:
  - 🟢 Winner - Finalizado por @gerente
  - 🔴 Red - Finalizado por @gerente

Adicione ao `.env`:

```env
GERENTE_ACAO_ROLE_ID=ID_DO_CARGO_GERENTE_ACAO
```


## Correção v4.8.1

- Corrigido erro **"Esta interação falhou"** ao clicar em **Ação Concluída**.
- O botão agora verifica o cargo pelo cache da interação e abre o modal imediatamente.
- A validação do cargo **Gerente Ação** continua ativa.


## Correção v4.8.2

- Corrigido botão **Ação Concluída** que não estava sendo tratado no interactionCreate.
- Corrigido botão **Gerenciar**.
- O botão **Ação Concluída** abre o modal imediatamente e exige o cargo `GERENTE_ACAO_ROLE_ID`.


## Versão Final - Win/Red

Alterações aplicadas:

- Removido sistema de Logs de Ação.
- Removidos botões:
  - Ação Concluída
  - Gerenciar
- Adicionados botões:
  - 🏆 Win
  - ❌ Red
- Apenas o cargo configurado em `GERENTE_ACAO_ROLE_ID` pode clicar em Win/Red.
- Painel mostra:
  - 👤 Resp. Pela Ação
  - Resultado Win/Red
  - Valor Arrecadado
- Mantidas funções:
  - Entrar na Equipe
  - Sair da Equipe
  - Registro de farmes
  - Aprovar/Reprovar farmes
  - Ranking semanal/mensal
  - Logs 1 e Logs 2 de farme


## Correção v5.0.1

- Corrigido erro de sintaxe após remover os modais antigos de Concluir/Gerenciar.
- Mantido somente Win/Red para Gerente Ação.


## Atualização v5.1.0 - Painel Inicial de Escalação

Novo comando:

```txt
/painel_escalacao
```

Ele envia um painel inicial com o botão:

```txt
🎯 Iniciar Escalação
```

Fluxo:

1. Liderança usa `/painel_escalacao`.
2. O bot envia o painel inicial.
3. Clique em `Iniciar Escalação`.
4. Preencha a criação em 2 etapas:
   - Etapa 1: Nome da Ação, Armamento, Data, Horário, Vagas
   - Etapa 2: Valor Arrecadado, Descrição
5. O bot envia o painel da ação no canal configurado em `ESCALACAO_CHANNEL_ID`.

Observação: Discord limita modais a 5 campos, por isso a criação fica em 2 etapas.


## Correção v5.1.1

- Corrigida repetição na interface principal do `/painel_escalacao`.
- Removidos campos extras duplicados.
- Mantida apenas a descrição principal e o botão 🎯 Iniciar Escalação.


## Correção v5.1.2

Mensagem do painel inicial de escalação atualizada para:

📢 Utilize este sistema para criar e organizar escalações de forma prática e eficiente.

Clique no botão abaixo 🎯 Iniciar Escalação para iniciar a criação de uma nova escalação.

🛡️ Disciplina • Foco • Lealdade • Respeito.
