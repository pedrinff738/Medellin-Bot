require("dotenv").config();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});



const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  InteractionType,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const GERENTE_FARME_ROLE_ID = process.env.GERENTE_FARME_ROLE_ID || process.env.GERENCIA_FARME_ROLE_ID || process.env.GERENTE_ROLE_ID || "1499119076352462859";
const LOGS_ANALISE_CHANNEL_ID = process.env.LOGS_ANALISE_CHANNEL_ID;
const LOGS_ANALISE_APROVADOS_REPROVADOS = process.env.LOGS_ANALISE_APROVADOS_REPROVADOS;
const ESCALACAO_CHANNEL_ID = process.env.ESCALACAO_CHANNEL_ID || "1510644958430892152";
const GERENTE_ACAO_ROLE_ID = process.env.GERENTE_ACAO_ROLE_ID || "1499119077317410926";
const PERM_PUXAR_ACAO_ROLE_ID = process.env.PERM_PUXAR_ACAO_ROLE_ID || "1510644764675018833";
const ACAO_MENTION_ROLE_ID = process.env.ACAO_MENTION_ROLE_ID || "1499119087643660411";
const LOGS_ESCALACAO_CHANNEL_ID = process.env.LOGS_ESCALACAO_CHANNEL_ID || "1510644374097362964";
const LOGS_CATEGORY_ID = process.env.LOGS_CATEGORY_ID || "1510644200004259900";

const CONFIG = {
  nomeFaccao: "Medellin",
  corPrincipal: 0x0A2A66,
  painelChannelId: "1509998889678405803",
  logsEnvioChannelId: LOGS_ANALISE_CHANNEL_ID || "1510042021228970014",
  logsAprovadosReprovadosChannelId: LOGS_ANALISE_APROVADOS_REPROVADOS,
  escalacaoChannelId: ESCALACAO_CHANNEL_ID,
  logsEscalacaoChannelId: LOGS_ESCALACAO_CHANNEL_ID,
  logsCategoryId: LOGS_CATEGORY_ID,
  gerenteAcaoRoleId: GERENTE_ACAO_ROLE_ID,
  permPuxarAcaoRoleId: PERM_PUXAR_ACAO_ROLE_ID,
  acaoMentionRoleId: ACAO_MENTION_ROLE_ID,
  gerenteRoleId: GERENTE_FARME_ROLE_ID,
  imagemLocal: path.join(__dirname, "assets", "medellin-thumbnail.png"),
  mensagemConfirmacao: "Registro enviado, após o envio, aguarde a análise da gerência de farme."
};

const DATA_FILE = path.join(__dirname, "database.json");
const TEMP_FILE = path.join(__dirname, "temp_registros.json");

function defaultDb() {
  return {
    registros: [],
    rankingSemanal: {},
    rankingMensal: {},
    ultimoResetSemanal: null,
    ultimoResetMensal: null,
    escalacoes: {}
  };
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadDb() {
  return loadJson(DATA_FILE, defaultDb());
}

function saveDb(db) {
  saveJson(DATA_FILE, db);
}

function loadTemp() {
  return loadJson(TEMP_FILE, {});
}

function saveTemp(temp) {
  saveJson(TEMP_FILE, temp);
}

function getLocalImageAttachment() {
  if (fs.existsSync(CONFIG.imagemLocal)) {
    return new AttachmentBuilder(CONFIG.imagemLocal, { name: "medellin-thumbnail.png" });
  }
  return null;
}

function applyLocalImage(embed, useBanner = false) {
  if (fs.existsSync(CONFIG.imagemLocal)) {
    embed.setThumbnail("attachment://medellin-thumbnail.png");
    if (useBanner) embed.setImage("attachment://medellin-thumbnail.png");
  }
  return embed;
}

function buildPayload(embed, components = [], useBanner = false, content = null) {
  applyLocalImage(embed, useBanner);

  const payload = { embeds: [embed], components };
  const attachment = getLocalImageAttachment();

  if (attachment) payload.files = [attachment];
  if (content) payload.content = content;

  return payload;
}

function isValidUrl(text) {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function isGerente(userId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(CONFIG.gerenteRoleId);
  } catch (error) {
    console.error("Erro ao verificar cargo de Gerência de Farme:", error);
    return false;
  }
}



function membroTemPermPuxarAcao(interaction) {
  try {
    const roles = interaction.member?.roles?.cache;
    if (!roles) return false;

    return roles.has(CONFIG.permPuxarAcaoRoleId)
      || roles.has(CONFIG.gerenteAcaoRoleId)
      || roles.has(CONFIG.gerenteRoleId);
  } catch {
    return false;
  }
}



function membroTemCargoGerenteAcao(interaction) {
  try {
    return Boolean(interaction.member?.roles?.cache?.has(CONFIG.gerenteAcaoRoleId));
  } catch {
    return false;
  }
}

async function isGerenteAcao(userId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(CONFIG.gerenteAcaoRoleId);
  } catch (error) {
    console.error("Erro ao verificar cargo de Gerente Ação:", error);
    return false;
  }
}


function addRanking(userId, nome, quantidade) {
  const db = loadDb();

  if (!db.rankingSemanal[userId]) db.rankingSemanal[userId] = { nome, quantidade: 0 };
  if (!db.rankingMensal[userId]) db.rankingMensal[userId] = { nome, quantidade: 0 };

  db.rankingSemanal[userId].nome = nome;
  db.rankingMensal[userId].nome = nome;

  db.rankingSemanal[userId].quantidade += quantidade;
  db.rankingMensal[userId].quantidade += quantidade;

  saveDb(db);
}

function formatRanking(ranking) {
  const top = Object.entries(ranking)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 5);

  if (top.length === 0) return "Nenhum farme aprovado ainda.";

  const medalhas = ["🥇", "🥈", "🥉", "🏅", "🏅"];

  return top
    .map(([userId, data], index) => `${medalhas[index]} **Top ${index + 1}** — <@${userId}> | ${data.nome} | **${data.quantidade}**`)
    .join("\n");
}

function painelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.corPrincipal)
    .setTitle("📦 Sistema de Registro de Farmes")
    .setDescription(
      `Bem-vindo ao sistema oficial de registro de farmes da Facção **${CONFIG.nomeFaccao}**. ` +
      "Para registrar seu farme, clique no botão abaixo e preencha corretamente todas as informações solicitadas. " +
      "Todos os registros serão analisados pela Gerência de Farme."
    )
    .setFooter({ text: "Medellin • Sistema de Farmes" });
}

function painelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_modal_farme_etapa_1")
      .setLabel("📦 Registrar Farme")
      .setStyle(ButtonStyle.Primary)
  );
}



function escalationMentionPayload(embed, components = []) {
  return {
    ...buildPayload(embed, components, true),
    content: `📢 **Escalação de ação aberta!**\n\n<@&${CONFIG.acaoMentionRoleId}>`,
    allowedMentions: {
      roles: [CONFIG.acaoMentionRoleId]
    }
  };
}




function painelEscalacaoEmbed() {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.corPrincipal)
    .setTitle("📋 ESCALAÇÃO DE AÇÃO")
    .setDescription(
      "📢 Utilize este sistema para criar e organizar escalações de forma prática e eficiente.\n\n" +
      "Clique no botão abaixo **🎯 Iniciar Escalação** para iniciar a criação de uma nova escalação.\n\n" +
      "🛡️ Disciplina • Foco • Lealdade • Respeito."
    )
    .setFooter({ text: "Medellin • Sistema de Escalação" });

  if (fs.existsSync(CONFIG.imagemLocal)) {
    embed.setThumbnail("attachment://medellin-thumbnail.png");
    embed.setImage("attachment://medellin-thumbnail.png");
  }

  return embed;
}

function painelEscalacaoButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("iniciar_escalacao")
      .setLabel("Iniciar Escalação")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Primary)
  );
}

function proximoEscalacaoButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("iniciar_escalacao_etapa_2")
      .setLabel("Próximo")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Primary)
  );
}

function modalEscalacaoEtapa1() {
  const modal = new ModalBuilder()
    .setCustomId("modal_escalacao_etapa_1")
    .setTitle("Criar Escalação - Etapa 1");

  const acao = new TextInputBuilder()
    .setCustomId("acao")
    .setLabel("👤 Nome da Ação")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: Niobio, Banco Central etc.")
    .setRequired(true);

  const armamento = new TextInputBuilder()
    .setCustomId("armamento")
    .setLabel("🔫 Armamento")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: Rifle, SubMetralhadora etc.")
    .setRequired(true);

  const data = new TextInputBuilder()
    .setCustomId("data")
    .setLabel("📅 Data")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: 29/05/2026")
    .setRequired(true);

  const horario = new TextInputBuilder()
    .setCustomId("horario")
    .setLabel("🕒 Horário")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: 22:00")
    .setRequired(true);

  const vagas = new TextInputBuilder()
    .setCustomId("vagas")
    .setLabel("👥 Vagas")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: 15")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(acao),
    new ActionRowBuilder().addComponents(armamento),
    new ActionRowBuilder().addComponents(data),
    new ActionRowBuilder().addComponents(horario),
    new ActionRowBuilder().addComponents(vagas)
  );

  return modal;
}

function modalEscalacaoEtapa2() {
  const modal = new ModalBuilder()
    .setCustomId("modal_escalacao_etapa_2")
    .setTitle("Criar Escalação - Etapa 2");

  const valor = new TextInputBuilder()
    .setCustomId("valor_arrecadado")
    .setLabel("💰 Valor Arrecadado")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: R$ 125.750,00 Dinheiro Sujo")
    .setRequired(false);

  const descricao = new TextInputBuilder()
    .setCustomId("descricao")
    .setLabel("📝 Descrição")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Exemplo: Todos comparecer na quadra.")
    .setRequired(false);

  const vagasReservas = new TextInputBuilder()
    .setCustomId("vagas_reservas")
    .setLabel("🔄 Vagas Reservas")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Exemplo: 5")
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(valor),
    new ActionRowBuilder().addComponents(descricao),
    new ActionRowBuilder().addComponents(vagasReservas)
  );

  return modal;
}


function rankingPainelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.corPrincipal)
    .setTitle("📊 Rankings de Farmes")
    .setDescription(
      "Confira os destaques da semana e do mês! " +
      "Escolha abaixo qual ranking deseja visualizar:"
    )
    .addFields(
      { name: "1️⃣ Ranking Semanal", value: "Mostra o Top-5 da semana atual.", inline: false },
      { name: "2️⃣ Ranking Mensal", value: "Mostra o Top-5 do mês atual.", inline: false }
    )
    .setFooter({ text: "Medellin • Sistema de Rankings" })
    .setTimestamp();
}

function rankingPainelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ranking_semanal")
      .setLabel("📅 Ranking Semanal")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ranking_mensal")
      .setLabel("🏆 Ranking Mensal")
      .setStyle(ButtonStyle.Secondary)
  );
}

function rankingDetalhadoEmbed(tipo, ranking) {
  const top = Object.entries(ranking)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 5);

  const titulo = tipo === "semanal" ? "📅 Ranking Semanal" : "🏆 Ranking Mensal";
  const medalhas = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  let descricao = "";

  if (top.length === 0) {
    descricao = "Nenhum farme aprovado ainda.";
  } else {
    descricao = top.map(([userId, data], index) => {
      return `${medalhas[index]} **${index + 1}º Lugar**\n👤 Usuário: <@${userId}> | ${data.nome}\n📦 Farme Entregue: **${data.quantidade}**`;
    }).join("\n");
  }

  return new EmbedBuilder()
    .setColor(CONFIG.corPrincipal)
    .setTitle(titulo)
    .setDescription(descricao)
    .addFields(
      { name: "🕒 Atualizado em", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setFooter({ text: "🏆 Continue farmando e garanta seu lugar no topo!" })
    .setTimestamp();
}

function proximoButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_modal_farme_etapa_2")
      .setLabel("➡️ Próximo")
      .setStyle(ButtonStyle.Primary)
  );
}


function escalacaoEmbed(escalacao) {
  const participantes = escalacao.participantes || [];
  const reservas = escalacao.reservas || [];
  const vagasReservas = Number(escalacao.vagasReservas || 0);

  const listaParticipantes = participantes.length
    ? participantes
        .slice(0, 20)
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join("\n")
    : "Nenhum membro escalado ainda.";

  const listaReservas = reservas.length
    ? reservas
        .slice(0, 20)
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join("\n")
    : "Nenhum reserva no momento.";

  const restanteParticipantes = participantes.length > 20 ? `\n... e mais ${participantes.length - 20}` : "";
  const restanteReservas = reservas.length > 20 ? `\n... e mais ${reservas.length - 20}` : "";
  const resultado = escalacao.resultado || "Aguardando resultado";
  const valor = escalacao.valorArrecadado || "Não informado";

  const embed = new EmbedBuilder()
    .setColor(CONFIG.corPrincipal)
    .setTitle("📋 ESCALAÇÃO DE AÇÃO")
    .setDescription(
      "```ansi\n" +
      "\u001b[1;34mMEDELLIN CORPORATION\u001b[0m\n" +
      "\u001b[1;37mDISCIPLINA • FOCO • LEALDADE\u001b[0m\n" +
      "```"
    )
    .addFields(
      { name: "👤  Nome da Ação", value: `> **${escalacao.acao || "Não informado"}**`, inline: false },
      { name: "👤  Resp. Pela Ação", value: `> <@${escalacao.criadaPor}>`, inline: false },
      { name: "🔫  Armamento", value: `> ${escalacao.armamento || "Não informado"}`, inline: false },
      { name: "📅  Data", value: `> ${escalacao.data || "Não informado"}`, inline: false },
      { name: "🕒  Horário", value: `> ${escalacao.horario || "Não informado"}`, inline: false },
      { name: "📝  Descrição", value: `> ${escalacao.descricao || "Não informado"}`, inline: false },
      { name: "👥  Participantes", value: `> **${participantes.length}/${escalacao.vagas}**\n${listaParticipantes}${restanteParticipantes}`, inline: false },
      { name: "🔄  Participantes Reservas", value: `> **${reservas.length}/${vagasReservas}**\n${listaReservas}${restanteReservas}`, inline: false },
      { name: "🏁  Resultado", value: `> ${resultado}`, inline: false },
      { name: "💰  Valor Arrecadado", value: `> ${valor}`, inline: false }
    );

  if (fs.existsSync(CONFIG.imagemLocal)) {
    embed.setThumbnail("attachment://medellin-thumbnail.png");
    embed.setImage("attachment://medellin-thumbnail.png");
  }

  return embed;
}

function escalacaoButtons(escalacaoId, encerrada = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`entrar_escalacao_${escalacaoId}`)
      .setLabel("Entrar na Equipe")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(encerrada),
    new ButtonBuilder()
      .setCustomId(`sair_escalacao_${escalacaoId}`)
      .setLabel("Sair da Equipe")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(encerrada),
    new ButtonBuilder()
      .setCustomId(`win_escalacao_${escalacaoId}`)
      .setLabel("Win")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(encerrada),
    new ButtonBuilder()
      .setCustomId(`red_escalacao_${escalacaoId}`)
      .setLabel("Red")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(encerrada),
    new ButtonBuilder()
      .setCustomId(`cancelar_escalacao_${escalacaoId}`)
      .setLabel("Cancelar")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(encerrada)
  );
}




function getEscalacao(escalacaoId) {
  const db = loadDb();
  if (!db.escalacoes) db.escalacoes = {};
  return { db, escalacao: db.escalacoes[escalacaoId] };
}

const LIMITE_ESCALACOES_ABERTAS = 2;

function getEscalacoesAbertas(db = loadDb()) {
  if (!db.escalacoes || typeof db.escalacoes !== "object") db.escalacoes = {};

  return Object.values(db.escalacoes).filter(escalacao => {
    if (!escalacao) return false;

    // Sistema reconstruído: somente status exatamente "Aberta" conta como vaga ocupada.
    // "Finalizada", "Cancelada", "Win", "Red" ou qualquer outro status libera vaga.
    return String(escalacao.status || "").toLowerCase() === "aberta";
  });
}

function quantidadeEscalacoesAbertas(db = loadDb()) {
  return getEscalacoesAbertas(db).length;
}

function podeCriarNovaEscalacao(db = loadDb()) {
  return quantidadeEscalacoesAbertas(db) < LIMITE_ESCALACOES_ABERTAS;
}

function mensagemLimiteEscalacoes(db = loadDb()) {
  const abertas = quantidadeEscalacoesAbertas(db);
  return `⚠️ Já existem **${abertas}/${LIMITE_ESCALACOES_ABERTAS}** escalações abertas no momento. Finalize ou cancele uma escalação para liberar vaga.`;
}

// Compatibilidade: se algum trecho antigo chamar essa função, ela agora segue o sistema novo.
// Ela só retorna algo quando o limite de 2 abertas for atingido.
function getEscalacaoAberta(db = loadDb()) {
  const abertas = getEscalacoesAbertas(db);
  return abertas.length >= LIMITE_ESCALACOES_ABERTAS ? abertas[0] : null;
}

async function enviarLogEscalacaoFinalizada(escalacao, escalacaoId, isWin) {
  try {
    const canalLogs = await client.channels.fetch(CONFIG.logsEscalacaoChannelId).catch(() => null);
    if (!canalLogs) {
      console.error("Canal de logs de escalação não encontrado ou sem permissão.");
      return null;
    }

    const mensagemLog = await canalLogs.send({
      ...buildPayload(escalacaoEmbed(escalacao), [], false),
      content: isWin ? "🏆 **Ação finalizada como WIN.**" : "❌ **Ação finalizada como RED.**"
    }).catch(error => {
      console.error("Erro ao enviar logs da escalação:", error);
      return null;
    });

    if (mensagemLog) {
      await mensagemLog.react(isWin ? "🏆" : "❌").catch(console.error);
    }

    return mensagemLog;
  } catch (error) {
    console.error("Erro em enviarLogEscalacaoFinalizada:", error);
    return null;
  }
}

async function excluirMensagemEscalacao(escalacao) {
  try {
    if (!escalacao.messageId) return;

    const canalEscalacao = await client.channels.fetch(CONFIG.escalacaoChannelId).catch(() => null);
    if (!canalEscalacao) return;

    const mensagem = await canalEscalacao.messages.fetch(escalacao.messageId).catch(() => null);
    if (!mensagem) return;

    await mensagem.delete().catch(console.error);
  } catch (error) {
    console.error("Erro ao excluir mensagem da escalação:", error);
  }
}

async function atualizarMensagemEscalacao(interaction, escalacao, escalacaoId, content = "📢 **Escalação de ação aberta!**") {
  const payload = {
    ...buildPayload(escalacaoEmbed(escalacao), [escalacaoButtons(escalacaoId, escalacao.status !== "Aberta")], false),
    content
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.message.edit(payload).catch(console.error);
  } else {
    await interaction.update(payload).catch(async () => {
      await interaction.deferUpdate().catch(() => null);
      await interaction.message.edit(payload).catch(console.error);
    });
  }
}


function registroEmbed(registro) {
  const fields = [
    { name: "👤 Nome", value: registro.nome || "Não informado", inline: true },
    { name: "🆔 ID", value: registro.idJogador || "Não informado", inline: true },
    { name: "📅 Data", value: registro.data || "Não informado", inline: true },
    { name: "🕒 Horário", value: registro.horario || "Não informado", inline: true },
    { name: "📦 Quantidade", value: String(registro.quantidade || "Não informado"), inline: true },
    { name: "🖼️ URL da Imagem", value: registro.urlImagem || "Não informado", inline: false },
    { name: "👥 Jogador", value: `<@${registro.discordUserId}>`, inline: true },
    { name: "📌 Status", value: registro.status || "Pendente", inline: true }
  ];

  if (registro.motivoReprovacao) {
    fields.push({ name: "📝 Motivo da Reprovação", value: registro.motivoReprovacao, inline: false });
  }

  const embed = new EmbedBuilder()
    .setColor(registro.status === "Aprovado" ? 0x2ECC71 : registro.status === "Reprovado" ? 0xE74C3C : CONFIG.corPrincipal)
    .setTitle("📦 Novo Registro de Farme")
    .setDescription("Um novo registro foi enviado e aguarda análise da Gerência de Farme.")
    .addFields(fields)
    .setFooter({ text: `Registro: ${registro.registroId}` })
    .setTimestamp();

  if (registro.urlImagem && isValidUrl(registro.urlImagem)) embed.setImage(registro.urlImagem);
  if (fs.existsSync(CONFIG.imagemLocal)) embed.setThumbnail("attachment://medellin-thumbnail.png");

  return embed;
}

function aprovacaoButtons(registroId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${registroId}`)
      .setLabel("✅ Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reprovar_${registroId}`)
      .setLabel("❌ Reprovar")
      .setStyle(ButtonStyle.Danger)
  );
}

function processingButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("processando_aprovar")
      .setLabel("⏳ Processando...")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("processando_reprovar")
      .setLabel("⏳ Aguarde...")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
}

async function sendLogEnvio(embed) {
  const channel = await client.channels.fetch(CONFIG.logsEnvioChannelId).catch(() => null);
  if (!channel) return null;

  return await channel.send(buildPayload(embed, [], false)).catch(error => {
    console.error(error);
    return null;
  });
}

async function sendLogAnalise(embed) {
  if (!CONFIG.logsAprovadosReprovadosChannelId) {
    console.error("LOGS_ANALISE_APROVADOS_REPROVADOS não foi configurado no .env");
    return null;
  }

  const channel = await client.channels.fetch(CONFIG.logsAprovadosReprovadosChannelId).catch(() => null);
  if (!channel) {
    console.error("Canal LOGS_ANALISE_APROVADOS_REPROVADOS não encontrado ou sem permissão.");
    return null;
  }

  return await channel.send(buildPayload(embed, [], false)).catch(error => {
    console.error(error);
    return null;
  });
}



async function reactToRegistroLog(registro, status) {
  try {
    if (!registro.logMessageId) return;

    const channel = await client.channels.fetch(CONFIG.logsEnvioChannelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(registro.logMessageId).catch(() => null);
    if (!message) return;

    await message.react(status === "Aprovado" ? "✅" : "❌").catch(console.error);
  } catch (error) {
    console.error("Erro ao reagir na mensagem de log:", error);
  }
}

function logEmbed(registro, status, gerente) {
  const fields = [
    { name: "👤 Nome", value: registro.nome || "Não informado", inline: true },
    { name: "🆔 ID", value: registro.idJogador || "Não informado", inline: true },
    { name: "📅 Data", value: registro.data || "Não informado", inline: true },
    { name: "🕒 Horário", value: registro.horario || "Não informado", inline: true },
    { name: "📦 Quantidade", value: String(registro.quantidade || "Não informado"), inline: true },
    { name: "🖼️ URL da Imagem", value: registro.urlImagem || "Não informado", inline: false },
    { name: "📌 Status", value: status, inline: true },
    { name: "👨‍💼 Responsável", value: `${gerente}`, inline: true },
    { name: "🕒 Data da Análise", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
  ];

  if (registro.motivoReprovacao) {
    fields.push({ name: "📝 Motivo da Reprovação", value: registro.motivoReprovacao, inline: false });
  }

  const embed = new EmbedBuilder()
    .setColor(status === "Aprovado" ? 0x2ECC71 : 0xE74C3C)
    .setTitle(status === "Aprovado" ? "✅ Farme Aprovado" : "❌ Farme Reprovado")
    .addFields(fields)
    .setTimestamp();

  if (registro.urlImagem && isValidUrl(registro.urlImagem)) embed.setImage(registro.urlImagem);

  return embed;
}


async function responderSeguro(interaction, options) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(options).catch(async () => {
        return await interaction.followUp({ ...options, ephemeral: true }).catch(() => null);
      });
    }

    return await interaction.reply(options).catch(() => null);
  } catch (error) {
    console.error("Erro ao responder interação:", error);
    return null;
  }
}

async function enviarPainelNoCanal(interaction, embed, components) {
  const channel = interaction.channel;
  if (!channel) {
    return await responderSeguro(interaction, {
      content: "❌ Não consegui identificar o canal atual.",
      ephemeral: true
    });
  }

  await channel.send(buildPayload(embed, components, true));
  return await responderSeguro(interaction, {
    content: "✅ Painel enviado neste canal.",
    ephemeral: true
  });
}


function farmePainelEmbed() {
  return painelEmbed();
}


function farmePainelButton() {
  return painelButton();
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("painel").setDescription("Envia o painel de registro de farmes."),
    new SlashCommandBuilder().setName("ranking").setDescription("Mostra o ranking semanal e mensal."),
    new SlashCommandBuilder().setName("painel_escalacao").setDescription("Envia o painel inicial de escalação de ação."),
    new SlashCommandBuilder().setName("painel_ranking").setDescription("Envia o painel interativo de rankings."),
    new SlashCommandBuilder()
      .setName("escalacao")
      .setDescription("Abre uma escalação de ação para a facção.")
      .addStringOption(option =>
        option
          .setName("acao")
          .setDescription("Nome da ação. Exemplo: Niobio, Banco Central etc.")
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName("armamento")
          .setDescription("Armamentos usados. Exemplo: Rifle, SubMetralhadora etc.")
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName("data")
          .setDescription("Data da ação. Exemplo: 29/05/2026")
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName("horario")
          .setDescription("Horário da ação. Exemplo: 22:00")
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName("vagas")
          .setDescription("Quantidade de vagas disponíveis")
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName("valor_arrecadado")
          .setDescription("Valor arrecadado. Ex.: R$ 125.750,00 Dinheiro Sujo")
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName("descricao")
          .setDescription("Descrição da ação")
          .setRequired(false)
      ),
    new SlashCommandBuilder().setName("reset_semanal").setDescription("Reseta o ranking semanal."),
    new SlashCommandBuilder().setName("reset_mensal").setDescription("Reseta o ranking mensal.")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados.");
}

async function finalizarAnalise(interaction, registroId, status, motivoReprovacao = null) {
  const userIsGerente = await isGerente(interaction.user.id);

  if (!userIsGerente) {
    if (interaction.message) {
      await interaction.message.edit({
        content: "❌ Apenas a Gerência de Farme pode aprovar ou reprovar registros.",
        components: []
      }).catch(() => null);
    } else {
      await interaction.editReply({ content: "❌ Apenas a Gerência de Farme pode aprovar ou reprovar registros." }).catch(() => null);
    }
    return;
  }

  const db = loadDb();
  const registro = db.registros.find(r => r.registroId === registroId);

  if (!registro) {
    if (interaction.message) {
      await interaction.message.edit({ content: "❌ Registro não encontrado.", components: [] }).catch(() => null);
    } else {
      await interaction.editReply({ content: "❌ Registro não encontrado." }).catch(() => null);
    }
    return;
  }

  if (registro.status !== "Pendente") {
    const payload = {
      content: `⚠️ Este registro já foi analisado. Status atual: ${registro.status}`,
      embeds: [registroEmbed(registro)],
      components: [],
      files: [getLocalImageAttachment()].filter(Boolean)
    };

    if (interaction.message) await interaction.message.edit(payload).catch(() => null);
    else await interaction.editReply({ content: payload.content }).catch(() => null);
    return;
  }

  registro.status = status;
  registro.responsavel = interaction.user.id;
  registro.dataAnalise = new Date().toISOString();

  if (status === "Reprovado") registro.motivoReprovacao = motivoReprovacao || "Não informado";

  saveDb(db);

  if (status === "Aprovado") addRanking(registro.discordUserId, registro.nome, registro.quantidade);

  const jogador = await client.users.fetch(registro.discordUserId).catch(() => null);

  if (jogador) {
    const embedUser = new EmbedBuilder()
      .setColor(status === "Aprovado" ? 0x2ECC71 : 0xE74C3C)
      .setTitle(status === "Aprovado" ? "✅ Farme Aprovado" : "❌ Farme Reprovado")
      .setDescription(
        status === "Aprovado"
          ? "Seu registro de farme foi aprovado pela Gerência de Farme."
          : "Seu registro de farme foi reprovado pela Gerência de Farme."
      )
      .addFields(
        { name: "👤 Nome", value: registro.nome || "Não informado", inline: true },
        { name: "🆔 ID", value: registro.idJogador || "Não informado", inline: true },
        { name: "📅 Data", value: registro.data || "Não informado", inline: true },
        { name: "🕒 Horário", value: registro.horario || "Não informado", inline: true },
        { name: "📦 Quantidade", value: String(registro.quantidade || "Não informado"), inline: true },
        { name: "👨‍💼 Responsável", value: interaction.user.tag, inline: false }
      )
      .setTimestamp();

    if (status === "Reprovado") {
      embedUser.addFields({ name: "📝 Motivo da Reprovação", value: registro.motivoReprovacao, inline: false });
    }

    await jogador.send(buildPayload(embedUser, [], false)).catch(() => null);
  }

  const mensagemLogAnalise = await sendLogAnalise(logEmbed(registro, status, interaction.user));

  if (mensagemLogAnalise) {
    await mensagemLogAnalise.react(status === "Aprovado" ? "✅" : "❌").catch(console.error);
  }

  const finalPayload = {
    content: `✅ Registro analisado por ${interaction.user}. Resultado: **${status}**`,
    embeds: [registroEmbed(registro)],
    components: [],
    files: [getLocalImageAttachment()].filter(Boolean)
  };

  if (interaction.message) await interaction.message.edit(finalPayload).catch(console.error);
  else await interaction.editReply({ content: finalPayload.content }).catch(() => null);
}


async function verificarCategoriaLogs() {
  try {
    const canais = [
      { nome: "Logs de envio de farmes", id: CONFIG.logsEnvioChannelId },
      { nome: "Logs de aprovados/reprovados", id: CONFIG.logsAprovadosReprovadosChannelId },
      { nome: "Logs de escalação", id: CONFIG.logsEscalacaoChannelId }
    ].filter(canal => canal.id);

    for (const canalInfo of canais) {
      const canal = await client.channels.fetch(canalInfo.id).catch(() => null);

      if (!canal) {
        console.log(`⚠️ ${canalInfo.nome}: canal não encontrado ou sem permissão.`);
        continue;
      }

      if (CONFIG.logsCategoryId && canal.parentId !== CONFIG.logsCategoryId) {
        console.log(`⚠️ ${canalInfo.nome} está fora da categoria de logs configurada.`);
      } else {
        console.log(`✅ ${canalInfo.nome} conferido na categoria de logs.`);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar categoria dos logs:", error);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.once("clientReady", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log("✅ Versão carregada: bloqueio reconstruído: máximo 2 escalações abertas - 2026-06-06");
  console.log("✅ Sistema novo ativo: até 2 escalações abertas simultâneas.");
  console.log("✅ Sistema de escalação ativo: limite novo de 2 escalações abertas simultâneas.");
  if (!CONFIG.logsAprovadosReprovadosChannelId) console.log("⚠️ LOGS_ANALISE_APROVADOS_REPROVADOS não configurado no .env.");
  await registerCommands().catch(console.error);
  await verificarCategoriaLogs().catch(console.error);

  setInterval(async () => {
    const db = loadDb();
    const now = new Date();

    if (now.getDay() === 0 && now.getHours() === 23 && now.getMinutes() === 59) {
      const key = now.toISOString().slice(0, 10);

      if (db.ultimoResetSemanal !== key) {
        db.rankingSemanal = {};
        db.ultimoResetSemanal = key;
        saveDb(db);

        await sendLogAnalise(
          new EmbedBuilder()
            .setColor(CONFIG.corPrincipal)
            .setTitle("🔄 Reset Semanal")
            .setDescription("O ranking semanal foi resetado automaticamente.")
            .setTimestamp()
        );
      }
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    if (tomorrow.getDate() === 1 && now.getHours() === 23 && now.getMinutes() === 59) {
      const key = now.toISOString().slice(0, 7);

      if (db.ultimoResetMensal !== key) {
        db.rankingMensal = {};
        db.ultimoResetMensal = key;
        saveDb(db);

        await sendLogAnalise(
          new EmbedBuilder()
            .setColor(CONFIG.corPrincipal)
            .setTitle("🏆 Reset Mensal")
            .setDescription("O ranking mensal foi resetado automaticamente.")
            .setTimestamp()
        );
      }
    }
  }, 60 * 1000);
});

client.on("interactionCreate", async (interaction) => {
  // PRIORIDADE MÁXIMA: botão Iniciar Escalação
  // O showModal precisa ser a PRIMEIRA resposta da interação.
  // Não coloque await, loadDb, saveDb, fetch, deferReply, deferUpdate, reply ou editReply antes disso.
  if (interaction.isButton() && interaction.customId === "iniciar_escalacao") {
    return interaction.showModal(modalEscalacaoEtapa1());
  }

  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);

        if (!(await isGerente(interaction.user.id))) {
          return await responderSeguro(interaction, {
            content: "❌ Apenas a Gerência de Farme pode enviar o painel.",
            ephemeral: true
          });
        }


        const channel = interaction.channel;

        if (!channel) {
          return await responderSeguro(interaction, {
            content: "❌ Não consegui identificar o canal atual.",
            ephemeral: true
          });
        }

        await channel.send(buildPayload(farmePainelEmbed(), [farmePainelButton()], true)).catch(error => {
          console.error("Erro ao enviar painel de farme:", error);
          return null;
        });

        return await responderSeguro(interaction, {
          content: "✅ Painel enviado com sucesso.",
          ephemeral: true
        });
      }

      

      if (interaction.commandName === "ranking") {
        const db = loadDb();

        const embed = new EmbedBuilder()
          .setColor(CONFIG.corPrincipal)
          .setTitle("📊 Rankings de Farmes")
          .addFields(
            { name: "📊 Ranking Semanal Top-5", value: formatRanking(db.rankingSemanal) },
            { name: "🏆 Ranking Mensal Top-5", value: formatRanking(db.rankingMensal) }
          )
          .setTimestamp();

        return interaction.reply(buildPayload(embed, [], false));
      }

      if (interaction.commandName === "escalacao") {
        if (!membroTemPermPuxarAcao(interaction)) return interaction.reply({ content: "❌ Você não possui o cargo **perm puxar ação**.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        if (!(await isGerente(interaction.user.id))) {
          return interaction.editReply({ content: "❌ Apenas a Liderança/Gerência pode abrir uma escalação." });
        }

        if (interaction.channelId !== CONFIG.escalacaoChannelId) {
          return interaction.editReply({
            content: `❌ Este comando só pode ser usado no canal <#${CONFIG.escalacaoChannelId}>.`
          });
        }

        const acao = interaction.options.getString("acao");
        const armamento = interaction.options.getString("armamento");
        const data = interaction.options.getString("data");
        const horario = interaction.options.getString("horario");
        const vagas = interaction.options.getInteger("vagas");
        const valorArrecadadoInicial = interaction.options.getString("valor_arrecadado") || "Não informado";
        const descricao = interaction.options.getString("descricao") || "Não informado";

        if (!vagas || vagas <= 0) {
          return interaction.editReply({ content: "❌ A quantidade de vagas precisa ser maior que 0." });
        }

        const escalacaoId = `${Date.now()}_${interaction.user.id}`;
        const db = loadDb();

        if (!db.escalacoes) db.escalacoes = {};

        if (!podeCriarNovaEscalacao(db)) {
          return interaction.editReply({
            content: mensagemLimiteEscalacoes(db)
          });
        }

        db.escalacoes[escalacaoId] = {
          id: escalacaoId,
          acao,
          armamento,
          data,
          horario,
          descricao,
          vagas,
          vagasReservas: 0,
          resultado: "Aguardando conclusão",
          valorArrecadado: valorArrecadadoInicial,
          status: "Aberta",
          criadaPor: interaction.user.id,
          participantes: [interaction.user.id],
          criadaEm: new Date().toISOString()
        };

        saveDb(db);

        const escalacao = db.escalacoes[escalacaoId];

        const canalEscalacao = await client.channels.fetch(CONFIG.escalacaoChannelId).catch(() => null);

        if (!canalEscalacao) {
          return interaction.editReply({ content: "❌ Canal de escalação não encontrado ou sem permissão." });
        }

        const msgEscalacao = await canalEscalacao.send(escalationMentionPayload(escalacaoEmbed(escalacao), [escalacaoButtons(escalacaoId)])).catch(error => {
          console.error("Erro ao enviar escalação:", error);
          return null;
        });

        if (!msgEscalacao) {
          return interaction.editReply({ content: "❌ Não consegui enviar a escalação. Verifique as permissões do bot no canal de escalação." });
        }

        escalacao.messageId = msgEscalacao.id;
        saveDb(db);

        return interaction.editReply({ content: "✅ Escalação aberta com sucesso neste canal." });
      }

      if (interaction.commandName === "painel_escalacao") {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);

        if (!membroTemPermPuxarAcao(interaction)) {
          return await responderSeguro(interaction, {
            content: "❌ Apenas quem possui o cargo **perm puxar ação** pode enviar o painel de escalação.",
            ephemeral: true
          });
        }

        const channel = interaction.channel;

        if (!channel) {
          return await responderSeguro(interaction, {
            content: "❌ Não consegui identificar o canal atual.",
            ephemeral: true
          });
        }

        await channel.send(buildPayload(painelEscalacaoEmbed(), [painelEscalacaoButton()], true)).catch(error => {
          console.error("Erro ao enviar painel de escalação:", error);
          return null;
        });

        return await responderSeguro(interaction, {
          content: "✅ Painel de escalação enviado neste canal.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "painel_ranking") {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (!(await isGerente(interaction.user.id))) {
          return interaction.editReply({ content: "❌ Apenas a Gerência de Farme pode enviar o painel de ranking." });
        }

        // Envia o painel de ranking no mesmo canal onde o comando foi usado.
        const channel = interaction.channel;

        if (!channel) {
          return interaction.editReply({ content: "❌ Não foi possível identificar o canal atual." });
        }

        await channel.send(buildPayload(rankingPainelEmbed(), [rankingPainelButtons()], true));

        return interaction.editReply({ content: "✅ Painel de ranking enviado neste canal." });
      }

      if (interaction.commandName === "reset_semanal") {
        if (!(await isGerente(interaction.user.id))) {
          return interaction.reply({ content: "❌ Apenas a Gerência de Farme pode usar isso.", ephemeral: true });
        }

        const db = loadDb();
        db.rankingSemanal = {};
        saveDb(db);

        return interaction.reply("✅ Ranking semanal resetado.");
      }

      if (interaction.commandName === "reset_mensal") {
        if (!(await isGerente(interaction.user.id))) {
          return interaction.reply({ content: "❌ Apenas a Gerência de Farme pode usar isso.", ephemeral: true });
        }

        const db = loadDb();
        db.rankingMensal = {};
        saveDb(db);

        return interaction.reply("✅ Ranking mensal resetado.");
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "abrir_modal_farme_etapa_1") {
        const modal = new ModalBuilder()
          .setCustomId("modal_registro_farme_etapa_1")
          .setTitle("Registro de Farme - Etapa 1");

        const nome = new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("👤 Nome")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const idJogador = new TextInputBuilder()
          .setCustomId("id_jogador")
          .setLabel("🆔 ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const data = new TextInputBuilder()
          .setCustomId("data")
          .setLabel("📅 Data")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Exemplo: 29/05/2026")
          .setRequired(true);

        const horario = new TextInputBuilder()
          .setCustomId("horario")
          .setLabel("🕒 Horário")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Exemplo: 20:30")
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nome),
          new ActionRowBuilder().addComponents(idJogador),
          new ActionRowBuilder().addComponents(data),
          new ActionRowBuilder().addComponents(horario)
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId === "abrir_modal_farme_etapa_2") {
        const temp = loadTemp();
        const dados = temp[interaction.user.id];

        if (!dados) {
          return interaction.reply({
            content: "❌ Primeiro preencha a Etapa 1 do registro.",
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId("modal_registro_farme_etapa_2")
          .setTitle("Registro de Farme - Etapa 2");

        const quantidade = new TextInputBuilder()
          .setCustomId("quantidade")
          .setLabel("📦 Quantidade")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Exemplo: 500")
          .setRequired(true);

        const urlImagem = new TextInputBuilder()
          .setCustomId("url_imagem")
          .setLabel("🖼️ URL da Imagem")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://link-da-imagem.com/prova.png")
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(quantidade),
          new ActionRowBuilder().addComponents(urlImagem)
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId === "iniciar_escalacao_etapa_2") {
        const temp = loadTemp();
        const dados = temp[`esc_${interaction.user.id}`];

        if (!dados) {
          return interaction.reply({
            content: "❌ Primeiro preencha a Etapa 1 da escalação.",
            ephemeral: true
          });
        }

        return interaction.showModal(modalEscalacaoEtapa2());
      }

      if (interaction.customId.startsWith("entrar_escalacao_")) {
        await interaction.deferUpdate().catch(() => null);

        const escalacaoId = interaction.customId.replace("entrar_escalacao_", "");
        const { db, escalacao } = getEscalacao(escalacaoId);

        if (!escalacao) {
          return interaction.followUp({ content: "❌ Escalação não encontrada.", ephemeral: true }).catch(() => null);
        }

        if (escalacao.status !== "Aberta") {
          return interaction.followUp({ content: "🔒 Esta escalação já foi finalizada.", ephemeral: true }).catch(() => null);
        }

        if (!Array.isArray(escalacao.participantes)) escalacao.participantes = [];
        if (!Array.isArray(escalacao.reservas)) escalacao.reservas = [];

        if (escalacao.participantes.includes(interaction.user.id)) {
          return interaction.followUp({ content: "⚠️ Você já está na equipe principal desta escalação.", ephemeral: true }).catch(() => null);
        }

        if (escalacao.reservas.includes(interaction.user.id)) {
          return interaction.followUp({ content: "⚠️ Você já está na lista de reservas desta escalação.", ephemeral: true }).catch(() => null);
        }

        let resposta = "";

        if (escalacao.participantes.length < escalacao.vagas) {
          escalacao.participantes.push(interaction.user.id);
          resposta = "✅ Você entrou na equipe principal.";
        } else {
          const limiteReservas = Number(escalacao.vagasReservas || 0);

          if (limiteReservas <= 0) {
            return interaction.followUp({
              content: "❌ A equipe principal está cheia e esta escalação não possui vagas reservas.",
              ephemeral: true
            }).catch(() => null);
          }

          if (escalacao.reservas.length >= limiteReservas) {
            return interaction.followUp({
              content: "❌ A equipe principal e as vagas reservas já estão cheias.",
              ephemeral: true
            }).catch(() => null);
          }

          escalacao.reservas.push(interaction.user.id);
          resposta = "🔄 A equipe principal está cheia. Você entrou como reserva.";
        }

        saveDb(db);

        await interaction.message.edit({
          ...buildPayload(escalacaoEmbed(escalacao), [escalacaoButtons(escalacaoId)], false),
          content: "📢 **Escalação de ação aberta!**"
        }).catch(console.error);

        return interaction.followUp({ content: resposta, ephemeral: true }).catch(() => null);
      }

      if (interaction.customId.startsWith("sair_escalacao_")) {
        await interaction.deferUpdate().catch(() => null);

        const escalacaoId = interaction.customId.replace("sair_escalacao_", "");
        const { db, escalacao } = getEscalacao(escalacaoId);

        if (!escalacao) {
          return interaction.followUp({ content: "❌ Escalação não encontrada.", ephemeral: true }).catch(() => null);
        }

        if (escalacao.status !== "Aberta") {
          return interaction.followUp({ content: "🔒 Esta escalação já foi finalizada.", ephemeral: true }).catch(() => null);
        }

        if (!Array.isArray(escalacao.participantes)) escalacao.participantes = [];
        if (!Array.isArray(escalacao.reservas)) escalacao.reservas = [];

        let saiu = false;
        let promovido = null;

        if (escalacao.participantes.includes(interaction.user.id)) {
          escalacao.participantes = escalacao.participantes.filter(id => id !== interaction.user.id);
          saiu = true;

          if (escalacao.reservas.length > 0 && escalacao.participantes.length < escalacao.vagas) {
            promovido = escalacao.reservas.shift();
            escalacao.participantes.push(promovido);
          }
        } else if (escalacao.reservas.includes(interaction.user.id)) {
          escalacao.reservas = escalacao.reservas.filter(id => id !== interaction.user.id);
          saiu = true;
        }

        if (!saiu) {
          return interaction.followUp({ content: "⚠️ Você não está nessa escalação.", ephemeral: true }).catch(() => null);
        }

        saveDb(db);

        await interaction.message.edit({
          ...buildPayload(escalacaoEmbed(escalacao), [escalacaoButtons(escalacaoId)], false),
          content: "📢 **Escalação de ação aberta!**"
        }).catch(console.error);

        const msg = promovido
          ? `✅ Você saiu da escalação. O reserva <@${promovido}> subiu automaticamente para a equipe principal.`
          : "✅ Você saiu da escalação.";

        return interaction.followUp({ content: msg, ephemeral: true }).catch(() => null);
      }

      if (interaction.customId.startsWith("cancelar_escalacao_")) {
        await interaction.deferUpdate().catch(() => null);

        const escalacaoId = interaction.customId.replace("cancelar_escalacao_", "");
        const { db, escalacao } = getEscalacao(escalacaoId);

        if (!escalacao) {
          return interaction.followUp({
            content: "❌ Escalação não encontrada.",
            ephemeral: true
          }).catch(() => null);
        }

        if (escalacao.criadaPor !== interaction.user.id) {
          return interaction.followUp({
            content: "❌ Apenas o responsável pela ação pode cancelar esta escalação.",
            ephemeral: true
          }).catch(() => null);
        }

        escalacao.status = "Cancelada";
        escalacao.resultado = `🗑️ Cancelada por <@${interaction.user.id}>`;
        escalacao.canceladaPor = interaction.user.id;
        escalacao.canceladaEm = new Date().toISOString();

        saveDb(db);

        await excluirMensagemEscalacao(escalacao);

        return interaction.followUp({
          content: "✅ Escalação cancelada com sucesso. Agora é possível criar uma nova escalação.",
          ephemeral: true
        }).catch(() => null);
      }

      if (interaction.customId.startsWith("win_escalacao_") || interaction.customId.startsWith("red_escalacao_")) {
        await interaction.deferUpdate().catch(() => null);

        if (!membroTemPermPuxarAcao(interaction)) {
          return interaction.followUp({
            content: "❌ Apenas o cargo **Gerente Ação** pode definir Win/Red.",
            ephemeral: true
          }).catch(() => null);
        }

        const isWin = interaction.customId.startsWith("win_escalacao_");
        const escalacaoId = interaction.customId
          .replace("win_escalacao_", "")
          .replace("red_escalacao_", "");

        const { db, escalacao } = getEscalacao(escalacaoId);

        if (!escalacao) {
          return interaction.followUp({ content: "❌ Escalação não encontrada.", ephemeral: true }).catch(() => null);
        }

        if (escalacao.criadaPor !== interaction.user.id) {
          return interaction.followUp({
            content: "❌ Apenas o **responsável que puxou essa ação** pode finalizar com Win/Red.",
            ephemeral: true
          }).catch(() => null);
        }

        if (escalacao.status !== "Aberta") {
          return interaction.followUp({ content: "⚠️ Esta escalação já foi finalizada.", ephemeral: true }).catch(() => null);
        }

        escalacao.status = "Finalizada";
        escalacao.resultado = isWin
          ? `🏆 Win - Finalizado por <@${interaction.user.id}>`
          : `❌ Red - Finalizado por <@${interaction.user.id}>`;
        escalacao.finalizadaPor = interaction.user.id;
        escalacao.finalizadaEm = new Date().toISOString();

        saveDb(db);

        await enviarLogEscalacaoFinalizada(escalacao, escalacaoId, isWin);
        await excluirMensagemEscalacao(escalacao);

        return interaction.followUp({
          content: isWin
            ? "🏆 Ação finalizada como **WIN** e enviada para os logs."
            : "❌ Ação finalizada como **RED** e enviada para os logs.",
          ephemeral: true
        }).catch(() => null);
      }

      if (interaction.customId === "ranking_semanal") {
        const db = loadDb();
        return interaction.reply({
          ...buildPayload(rankingDetalhadoEmbed("semanal", db.rankingSemanal), [], false),
          ephemeral: true
        });
      }

      if (interaction.customId === "ranking_mensal") {
        const db = loadDb();
        return interaction.reply({
          ...buildPayload(rankingDetalhadoEmbed("mensal", db.rankingMensal), [], false),
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith("aprovar_")) {
        await interaction.update({
          content: "⏳ Processando aprovação do farme...",
          components: [processingButtons()]
        });

        const registroId = interaction.customId.replace("aprovar_", "");
        await finalizarAnalise(interaction, registroId, "Aprovado");
        return;
      }

      if (interaction.customId.startsWith("reprovar_")) {
        const registroId = interaction.customId.replace("reprovar_", "");

        const modal = new ModalBuilder()
          .setCustomId(`modal_motivo_reprovacao_${registroId}`)
          .setTitle("Motivo da Reprovação");

        const motivo = new TextInputBuilder()
          .setCustomId("motivo_reprovacao")
          .setLabel("📝 Motivo da Reprovação")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Exemplo: imagem inválida, quantidade incorreta, prova incompleta...")
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(motivo));

        return interaction.showModal(modal);
      }
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "modal_escalacao_etapa_1") {
      const acao = interaction.fields.getTextInputValue("acao");
      const armamento = interaction.fields.getTextInputValue("armamento");
      const data = interaction.fields.getTextInputValue("data");
      const horario = interaction.fields.getTextInputValue("horario");
      const vagasRaw = interaction.fields.getTextInputValue("vagas");

      const vagas = Number(vagasRaw.replace(/\D/g, ""));

      if (!vagas || vagas <= 0) {
        return interaction.reply({
          content: "❌ A quantidade de vagas precisa ser um número válido. Exemplo: 15",
          ephemeral: true
        });
      }

      const dbLimiteEscalacao = loadDb();
      if (!podeCriarNovaEscalacao(dbLimiteEscalacao)) {
        return interaction.reply({
          content: mensagemLimiteEscalacoes(dbLimiteEscalacao),
          ephemeral: true
        });
      }

      const temp = loadTemp();
      temp[`esc_${interaction.user.id}`] = {
        acao,
        armamento,
        data,
        horario,
        vagas,
        criadoEm: Date.now()
      };
      saveTemp(temp);

      return interaction.reply({
        content: "✅ Etapa 1 concluída. Clique em **➡️ Próximo** para preencher Valor Arrecadado e Descrição.",
        components: [proximoEscalacaoButton()],
        ephemeral: true
      });
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "modal_escalacao_etapa_2") {
      await interaction.deferReply({ ephemeral: true });

      const temp = loadTemp();
      const dadosEtapa1 = temp[`esc_${interaction.user.id}`];

      if (!dadosEtapa1) {
        return interaction.editReply({
          content: "❌ Dados da Etapa 1 não encontrados. Clique novamente em Iniciar Escalação."
        });
      }

      const vagasReservasRaw = interaction.fields.getTextInputValue("vagas_reservas") || "0";
      const vagasReservas = Number(vagasReservasRaw.replace(/\D/g, "")) || 0;
      const valorArrecadadoInicial = interaction.fields.getTextInputValue("valor_arrecadado") || "Não informado";
      const descricao = interaction.fields.getTextInputValue("descricao") || "Não informado";
      const escalacaoId = `${Date.now()}_${interaction.user.id}`;
      const db = loadDb();

      if (!db.escalacoes) db.escalacoes = {};

      if (!podeCriarNovaEscalacao(db)) {
        delete temp[`esc_${interaction.user.id}`];
        saveTemp(temp);

        return interaction.editReply({
          content: mensagemLimiteEscalacoes(db)
        });
      }

      db.escalacoes[escalacaoId] = {
        id: escalacaoId,
        acao: dadosEtapa1.acao,
        armamento: dadosEtapa1.armamento,
        data: dadosEtapa1.data,
        horario: dadosEtapa1.horario,
        vagas: dadosEtapa1.vagas,
        vagasReservas,
        descricao,
        valorArrecadado: valorArrecadadoInicial,
        resultado: "Aguardando resultado",
        status: "Aberta",
        criadaPor: interaction.user.id,
        participantes: [interaction.user.id],
        reservas: [],
        criadaEm: new Date().toISOString()
      };

      saveDb(db);

      delete temp[`esc_${interaction.user.id}`];
      saveTemp(temp);

      const escalacao = db.escalacoes[escalacaoId];

      const canalEscalacao = await client.channels.fetch(CONFIG.escalacaoChannelId).catch(() => null);

      if (!canalEscalacao) {
        return interaction.editReply({
          content: "❌ Canal de escalação não encontrado ou sem permissão."
        });
      }

      const msgEscalacao = await canalEscalacao.send(escalationMentionPayload(escalacaoEmbed(escalacao), [escalacaoButtons(escalacaoId)])).catch(error => {
        console.error("Erro ao enviar escalação:", error);
        return null;
      });

      if (!msgEscalacao) {
        return interaction.editReply({
          content: "❌ Não consegui enviar a escalação. Verifique as permissões do bot no canal de escalação."
        });
      }

      escalacao.messageId = msgEscalacao.id;
      saveDb(db);

      return interaction.editReply({
        content: "✅ Escalação criada com sucesso."
      });
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "modal_registro_farme_etapa_1") {
      const nome = interaction.fields.getTextInputValue("nome");
      const idJogador = interaction.fields.getTextInputValue("id_jogador");
      const data = interaction.fields.getTextInputValue("data");
      const horario = interaction.fields.getTextInputValue("horario");

      const temp = loadTemp();
      temp[interaction.user.id] = {
        nome,
        idJogador,
        data,
        horario,
        criadoEm: Date.now()
      };
      saveTemp(temp);

      return interaction.reply({
        content: "✅ Etapa 1 concluída. Clique em **➡️ Próximo** para preencher Quantidade e URL da Imagem.",
        components: [proximoButton()],
        ephemeral: true
      });
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "modal_registro_farme_etapa_2") {
      await interaction.deferReply({ ephemeral: true });

      const temp = loadTemp();
      const dadosEtapa1 = temp[interaction.user.id];

      if (!dadosEtapa1) {
        return interaction.editReply({
          content: "❌ Dados da Etapa 1 não encontrados. Clique novamente em Registrar Farme."
        });
      }

      const quantidadeRaw = interaction.fields.getTextInputValue("quantidade");
      const urlImagem = interaction.fields.getTextInputValue("url_imagem");
      const quantidade = Number(quantidadeRaw.replace(/\D/g, ""));

      if (!quantidade || quantidade <= 0) {
        return interaction.editReply({
          content: "❌ A quantidade precisa ser um número válido. Exemplo: 500"
        });
      }

      if (!isValidUrl(urlImagem)) {
        return interaction.editReply({
          content: "❌ A URL da imagem precisa ser um link válido começando com http:// ou https://"
        });
      }

      const registroId = `${Date.now()}_${interaction.user.id}`;

      const registro = {
        registroId,
        nome: dadosEtapa1.nome,
        idJogador: dadosEtapa1.idJogador,
        data: dadosEtapa1.data,
        horario: dadosEtapa1.horario,
        quantidade,
        urlImagem,
        discordUserId: interaction.user.id,
        discordUserTag: interaction.user.tag,
        status: "Pendente",
        responsavel: null,
        motivoReprovacao: null,
        logMessageId: null,
        dataEnvio: new Date().toISOString(),
        dataAnalise: null
      };

      const db = loadDb();
      db.registros.push(registro);
      saveDb(db);

      delete temp[interaction.user.id];
      saveTemp(temp);

      await interaction.editReply({
        content: `✅ ${CONFIG.mensagemConfirmacao}`
      });

      try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const fullGuild = await guild.fetch();
        const members = await fullGuild.members.fetch();
        const gerentes = members.filter(member => member.roles.cache.has(CONFIG.gerenteRoleId));

        for (const [, member] of gerentes) {
          await member.send({
            embeds: [registroEmbed(registro)],
            components: [aprovacaoButtons(registroId)],
            files: [getLocalImageAttachment()].filter(Boolean)
          }).catch(() => null);
        }

        const logNovo = new EmbedBuilder()
          .setColor(CONFIG.corPrincipal)
          .setTitle("📦 Novo Farme Enviado")
          .setDescription(`Um novo registro foi enviado por <@${interaction.user.id}>.`)
          .addFields(
            { name: "👤 Nome", value: registro.nome, inline: true },
            { name: "🆔 ID", value: registro.idJogador, inline: true },
            { name: "📅 Data", value: registro.data, inline: true },
            { name: "🕒 Horário", value: registro.horario, inline: true },
            { name: "📦 Quantidade", value: String(quantidade), inline: true },
            { name: "🖼️ URL da Imagem", value: urlImagem, inline: false },
            { name: "📌 Status", value: "Pendente", inline: true }
          )
          .setImage(urlImagem)
          .setTimestamp();

        const logMessage = await sendLogEnvio(logNovo);

        if (logMessage) {
          const dbAtualizado = loadDb();
          const registroSalvo = dbAtualizado.registros.find(r => r.registroId === registroId);
          if (registroSalvo) {
            registroSalvo.logMessageId = logMessage.id;
            saveDb(dbAtualizado);
          }
        }
      } catch (error) {
        console.error("Erro ao encaminhar registro para gerência/logs:", error);
      }

      return;
    }


    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith("modal_motivo_reprovacao_")) {
      await interaction.deferReply({ ephemeral: true });

      const registroId = interaction.customId.replace("modal_motivo_reprovacao_", "");
      const motivo = interaction.fields.getTextInputValue("motivo_reprovacao");

      await interaction.editReply({ content: "⏳ Processando reprovação do farme..." });

      await finalizarAnalise(interaction, registroId, "Reprovado", motivo);

      await interaction.editReply({ content: "✅ Registro reprovado com motivo informado." }).catch(() => null);
      return;
    }
  } catch (error) {
    console.error("Erro na interação:", error);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Ocorreu um erro ao executar esta ação.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Ocorreu um erro ao executar esta ação.", ephemeral: true });
      }
    } catch {}
  }
});

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.log("❌ Configure TOKEN, CLIENT_ID e GUILD_ID no arquivo .env");
  process.exit(1);
}

client.login(TOKEN);
