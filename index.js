/**
 * Discord Bot — Black & Green Theme (discord.js v14)
 * Features:
 *  - Ticket system: setup panel (3 categories), open, claim, close, transcript/logging
 *  - Giveaway system: start, end, reroll (🎉 reactions)
 *  - Welcome message
 *  - Boost message
 *  - Invite & Message tracker + leaderboards
 *
 * Quick start:
 *  1) npm init -y && npm i discord.js dotenv
 *  2) Create a .env file with: TOKEN=YOUR_BOT_TOKEN
 *  3) (Optional) Add channel/role IDs below in CONFIG or use /ticket-setup to create a panel.
 *  4) node index.js
 *
 * Required Gateway Intents in Bot Portal:
 *  - SERVER MEMBERS INTENT (for welcomes/boosts)
 *  - MESSAGE CONTENT NOT REQUIRED
 *  - Presence not required
 */

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  AttachmentBuilder,
  PermissionFlagsBits,
  Collection,
} = require('discord.js');
require('dotenv').config();

// === THEME ===
const THEME = {
  accent: 0x00ff88, // green accent
  muted: 0x0b0f10,  // near-black (for reference in comments)
  footer: '⚡ Black & Green Utilities',
};

// === BASIC CONFIG ===
// Fill these with your server IDs (you can change anytime). If left null, commands will prompt/channel options can be passed.
const CONFIG = {
  GUILD_ID: null, // e.g. '123456789012345678'
  STAFF_ROLE_ID: null, // role that can see and manage tickets
  WELCOME_CHANNEL_ID: null,
  BOOST_CHANNEL_ID: null,
  LOG_CHANNEL_ID: null, // transcripts + bot logs
  // Ticket categories (category channel IDs). If null, create them in /ticket-setup or pass as options.
  TICKET_CATEGORIES: {
    general: null,
    partner: null,
    management: null,
  },
};

// === DATA STORAGE (simple JSON persistence) ===
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const file = (name) => path.join(DATA_DIR, name);
const loadJSON = (name, def = {}) => {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch {
    return def;
  }
};
const saveJSON = (name, obj) => fs.writeFileSync(file(name), JSON.stringify(obj, null, 2));

// Tracks invite uses per inviter: { guildId: { inviterId: count } }
let inviteCounts = loadJSON('invites.json', {});
// Tracks message counts per user: { guildId: { userId: count } }
let messageCounts = loadJSON('messages.json', {});
// Giveaway registry: { guildId: { messageId: { channelId, prize, winners, endAt } } }
let giveaways = loadJSON('giveaways.json', {});

// Keep cached invites by code per guild
const guildInvitesCache = new Map(); // guildId -> Map(code => uses)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

// === UTILITIES ===
const ensureGuildObj = (store, guildId) => (store[guildId] ||= {});
const fmt = (n) => new Intl.NumberFormat().format(n);
const chooseRandom = (arr, n) => {
  const pool = [...arr];
  const winners = [];
  while (winners.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]);
  }
  return winners;
};
const greenEmbed = (title) => new EmbedBuilder().setColor(THEME.accent).setTitle(title).setTimestamp().setFooter({ text: THEME.footer });
const idOr = (a, b) => (a && String(a).match(/^\d{17,}$/) ? a : b || null);

// === COMMAND REGISTRATION ===
const commands = [
  // Ticket setup — posts the 3-button panel
  new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Post a ticket panel with General / Partner / Management buttons')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the panel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addRoleOption(o => o.setName('staff_role').setDescription('Staff role with access to tickets').setRequired(false))
    .addChannelOption(o => o.setName('general_category').setDescription('Category for general tickets').addChannelTypes(ChannelType.GuildCategory))
    .addChannelOption(o => o.setName('partner_category').setDescription('Category for partner tickets').addChannelTypes(ChannelType.GuildCategory))
    .addChannelOption(o => o.setName('management_category').setDescription('Category for management tickets').addChannelTypes(ChannelType.GuildCategory)),

  // Ticket commands
  new SlashCommandBuilder().setName('ticket-claim').setDescription('Claim the current ticket channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('ticket-close').setDescription('Close this ticket (locks, creates transcript)').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('ticket-transcript').setDescription('Generate a transcript for this ticket').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // Giveaway commands
  new SlashCommandBuilder()
    .setName('giveaway-start')
    .setDescription('Start a giveaway (🎉 reactions)')
    .addStringOption(o => o.setName('prize').setDescription('Prize name').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration like 10m, 2h, 3d').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel for the giveaway').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End a giveaway early')
    .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('giveaway-reroll')
    .setDescription('Reroll winners for a giveaway')
    .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // Leaderboards
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show top inviters or message senders')
    .addStringOption(o => o
      .setName('type')
      .setDescription('invites or messages')
      .addChoices({ name: 'invites', value: 'invites' }, { name: 'messages', value: 'messages' })
      .setRequired(true)
    ),
];

async function registerCommands() {
  const token = process.env.TOKEN;
  if (!token) throw new Error('Missing TOKEN in .env');
  const rest = new REST({ version: '10' }).setToken(token);
  const body = commands.map(c => c.toJSON());
  if (CONFIG.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, CONFIG.GUILD_ID), { body });
    console.log('✓ Registered guild commands');
  } else {
    await rest.put(Routes.applicationCommands(client.user.id), { body });
    console.log('✓ Registered global commands');
  }
}

// === READY: cache invites ===
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Black & Green ops');

  // Cache invites for all guilds
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const invites = await guild.invites.fetch();
      guildInvitesCache.set(guildId, new Map(invites.map(i => [i.code, i.uses || 0])));
    } catch (e) {
      console.warn(`Invite cache failed for ${guildId}:`, e.message);
    }
  }

  // Register commands now that we have client.user.id
  try { await registerCommands(); } catch (e) { console.error('Command registration failed:', e); }

  // Start giveaway watcher
  setInterval(checkGiveaways, 15_000);
});

// === INVITE TRACKING ===
client.on('inviteCreate', async inv => {
  const cache = guildInvitesCache.get(inv.guild.id) || new Map();
  cache.set(inv.code, inv.uses || 0);
  guildInvitesCache.set(inv.guild.id, cache);
});
client.on('inviteDelete', async inv => {
  const cache = guildInvitesCache.get(inv.guild.id) || new Map();
  cache.delete(inv.code);
});

client.on('guildMemberAdd', async member => {
  // Welcome message
  try {
    const chId = idOr(CONFIG.WELCOME_CHANNEL_ID, null);
    const ch = chId ? member.guild.channels.cache.get(chId) : null;
    if (ch && ch.type === ChannelType.GuildText) {
      const emb = greenEmbed('Welcome aboard!')
        .setDescription(`Hey ${member}, glad to have you here! Check out the rules and say hi ✨`)
        .setThumbnail(member.user.displayAvatarURL());
      ch.send({ embeds: [emb] });
    }
  } catch {}

  // Determine used invite
  try {
    const newInvites = await member.guild.invites.fetch();
    const cached = guildInvitesCache.get(member.guild.id) || new Map();
    const used = newInvites.find(i => (cached.get(i.code) || 0) < (i.uses || 0));
    guildInvitesCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses || 0])));

    const guildStore = ensureGuildObj(inviteCounts, member.guild.id);
    let inviterId = null;
    if (used && used.inviter) inviterId = used.inviter.id;
    else if (member.guild.vanityURLCode) {
      inviterId = 'VANITY_URL';
    }
    if (inviterId) {
      guildStore[inviterId] = (guildStore[inviterId] || 0) + 1;
      saveJSON('invites.json', inviteCounts);
    }
  } catch (e) {
    console.warn('Invite tracking error:', e.message);
  }
});

// BOOST MESSAGE (nitro boost)
client.on('guildMemberUpdate', async (oldM, newM) => {
  try {
    const had = oldM.premiumSince;
    const has = newM.premiumSince;
    if (!had && has) {
      const chId = idOr(CONFIG.BOOST_CHANNEL_ID, null);
      const ch = chId ? newM.guild.channels.cache.get(chId) : null;
      if (ch && ch.type === ChannelType.GuildText) {
        const emb = greenEmbed('Server Boosted!')
          .setDescription(`${newM} just boosted the server! Thanks for the sparkles ✨`)
          .setThumbnail(newM.user.displayAvatarURL());
        ch.send({ embeds: [emb] });
      }
    }
  } catch {}
});

// MESSAGE TRACKER
client.on('messageCreate', (msg) => {
  if (!msg.guild || msg.author.bot) return;
  const store = ensureGuildObj(messageCounts, msg.guild.id);
  store[msg.author.id] = (store[msg.author.id] || 0) + 1;
  saveJSON('messages.json', messageCounts);
});

// === INTERACTIONS ===
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (commandName === 'ticket-setup') return ticketSetup(interaction);
      if (commandName === 'ticket-claim') return ticketClaim(interaction);
      if (commandName === 'ticket-close') return ticketClose(interaction);
      if (commandName === 'ticket-transcript') return ticketTranscript(interaction);
      if (commandName === 'giveaway-start') return giveawayStart(interaction);
      if (commandName === 'giveaway-end') return giveawayEnd(interaction);
      if (commandName === 'giveaway-reroll') return giveawayReroll(interaction);
      if (commandName === 'leaderboard') return leaderboard(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_open_')) {
        return openTicket(interaction);
      }
    }
  } catch (e) {
    console.error('Interaction error:', e);
    if (interaction.isRepliable()) {
      interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(()=>{});
    }
  }
});

// === TICKETS ===
function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open_general').setLabel('General Ticket').setEmoji('🎫').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_open_partner').setLabel('Partner Ticket').setEmoji('🤝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_open_management').setLabel('Management Ticket').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
  );
}

async function ticketSetup(interaction) {
  const ch = interaction.options.getChannel('channel', true);
  const staffRole = interaction.options.getRole('staff_role');
  const generalCat = interaction.options.getChannel('general_category');
  const partnerCat = interaction.options.getChannel('partner_category');
  const managementCat = interaction.options.getChannel('management_category');

  if (staffRole) CONFIG.STAFF_ROLE_ID = staffRole.id;
  if (generalCat) CONFIG.TICKET_CATEGORIES.general = generalCat.id;
  if (partnerCat) CONFIG.TICKET_CATEGORIES.partner = partnerCat.id;
  if (managementCat) CONFIG.TICKET_CATEGORIES.management = managementCat.id;

  const panel = greenEmbed('Open a Ticket')
    .setDescription('Choose a ticket type below and a private channel will be created for you. Staff will be with you shortly 💬');

  await ch.send({ embeds: [panel], components: [ticketButtons()] });
  await interaction.reply({ content: '✅ Ticket panel posted.', ephemeral: true });
}

async function openTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const type = interaction.customId.split('_').pop(); // general | partner | management
  const guild = interaction.guild;

  const categoryId = CONFIG.TICKET_CATEGORIES[type];
  const staffRoleId = CONFIG.STAFF_ROLE_ID;
  if (!categoryId || !staffRoleId) {
    return interaction.editReply('❌ Ticket system not fully configured. Use /ticket-setup to set categories and staff role.');
  }

  // If user already has an open ticket in this type, prevent duplicate
  const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.parentId === categoryId && c.topic && c.topic.includes(`UID:${interaction.user.id}`));
  if (existing) return interaction.editReply(`You already have a ${type} ticket: ${existing}`);

  const name = `${type}-ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 90);

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: categoryId,
    topic: `Ticket type: ${type} | UID:${interaction.user.id}`,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
    ],
  });

  const emb = greenEmbed('Ticket Created')
    .setDescription(`Type: **${type}**\nUser: ${interaction.user}\n\nA staff member will claim your ticket shortly.`);
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success).setDisabled(true), // just for UI hint; real claim via /ticket-claim
    new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger).setDisabled(true),   // close via /ticket-close
  );
  await channel.send({ content: `<@&${staffRoleId}> ${interaction.user}`, embeds: [emb], components: [controls] }).catch(()=>{});

  await interaction.editReply(`✅ Your ${type} ticket was created: ${channel}`);
}

async function ticketClaim(interaction) {
  const ch = interaction.channel;
  if (ch.type !== ChannelType.GuildText || !ch.topic || !ch.topic.includes('UID:')) return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });

  await ch.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await ch.setTopic(`${ch.topic} | ClaimedBy:${interaction.user.id}`);
  await ch.send({ embeds: [greenEmbed('Ticket Claimed').setDescription(`${interaction.user} has claimed this ticket.`)] });
  await interaction.reply({ content: '✅ Claimed.', ephemeral: true });
}

async function ticketTranscript(interaction) {
  const ch = interaction.channel;
  if (ch.type !== ChannelType.GuildText || !ch.topic || !ch.topic.includes('UID:')) return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });

  const log = await buildTranscript(ch);
  const att = new AttachmentBuilder(Buffer.from(log, 'utf8'), { name: `${ch.name}-transcript.txt` });
  await interaction.reply({ content: '📄 Transcript generated.', files: [att], ephemeral: true });
}

async function ticketClose(interaction) {
  const ch = interaction.channel;
  if (ch.type !== ChannelType.GuildText || !ch.topic || !ch.topic.includes('UID:')) return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });

  // Lock channel and post transcript to log channel
  await ch.permissionOverwrites.edit(ch.guild.id, { ViewChannel: false });
  await ch.permissionOverwrites.edit(ch.guild.roles.everyone, { SendMessages: false }).catch(()=>{});

  const logText = await buildTranscript(ch);
  const att = new AttachmentBuilder(Buffer.from(logText, 'utf8'), { name: `${ch.name}-transcript.txt` });

  const logChId = idOr(CONFIG.LOG_CHANNEL_ID, null);
  const logCh = logChId ? ch.guild.channels.cache.get(logChId) : null;
  if (logCh && logCh.type === ChannelType.GuildText) {
    await logCh.send({ embeds: [greenEmbed('Ticket Closed').setDescription(`Channel: ${ch} was closed by ${interaction.user}`)], files: [att] }).catch(()=>{});
  }

  await ch.send({ embeds: [greenEmbed('Closing Ticket').setDescription('This ticket will be deleted in 10 seconds...')] });
  setTimeout(() => ch.delete().catch(()=>{}), 10_000);
  await interaction.reply({ content: '🗑️ Ticket closing scheduled.', ephemeral: true });
}

async function buildTranscript(channel) {
  let before;
  const lines = [`# Transcript for ${channel.name}`, `Generated: ${new Date().toISOString()}`, ''];
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const m of sorted) {
      const time = new Date(m.createdTimestamp).toISOString();
      const author = `${m.author.tag} (${m.author.id})`;
      const content = m.cleanContent || '';
      lines.push(`[${time}] ${author}: ${content}`);
      for (const att of m.attachments.values()) {
        lines.push(`  [attachment] ${att.name} ${att.url}`);
      }
      if (m.embeds.length) lines.push(`  [embeds] ${m.embeds.length}`);
    }
    before = sorted[0].id;
  }
  return lines.join('\n');
}

// === GIVEAWAYS ===
function parseDuration(str) {
  const m = String(str).trim().match(/^(\d+)([smhdw])$/i);
  if (!m) return null;
  const num = parseInt(m[1]);
  const unit = m[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return num * (multipliers[unit] || 0);
}

async function giveawayStart(interaction) {
  const prize = interaction.options.getString('prize', true);
  const winners = interaction.options.getInteger('winners', true);
  const durationStr = interaction.options.getString('duration', true);
  const ms = parseDuration(durationStr);
  if (!ms) return interaction.reply({ content: '❌ Invalid duration. Use formats like 10m, 2h, 3d.', ephemeral: true });
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const endAt = Date.now() + ms;
  const emb = greenEmbed('🎉 Giveaway')
    .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n\nReact with 🎉 to enter!`)
    .setFooter({ text: `${THEME.footer} • Ends at ${new Date(endAt).toISOString()}` });

  const msg = await channel.send({ embeds: [emb] });
  await msg.react('🎉');

  const g = ensureGuildObj(giveaways, interaction.guild.id);
  g[msg.id] = { channelId: channel.id, prize, winners, endAt };
  saveJSON('giveaways.json', giveaways);

  await interaction.reply({ content: `✅ Giveaway started in ${channel}.`, ephemeral: true });
}

async function giveawayEnd(interaction) {
  const id = interaction.options.getString('message_id', true);
  const g = giveaways[interaction.guild.id]?.[id];
  if (!g) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
  await finalizeGiveaway(interaction.guild, id, g, { announce: true });
  await interaction.reply({ content: '⏹️ Giveaway ended.', ephemeral: true });
}

async function giveawayReroll(interaction) {
  const id = interaction.options.getString('message_id', true);
  const g = giveaways[interaction.guild.id]?.[id];
  if (!g) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
  await finalizeGiveaway(interaction.guild, id, g, { reroll: true, announce: true });
  await interaction.reply({ content: '🔁 Rerolled winners.', ephemeral: true });
}

async function checkGiveaways() {
  for (const [guildId, entries] of Object.entries(giveaways)) {
    for (const [messageId, g] of Object.entries(entries)) {
      if (Date.now() >= g.endAt) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;
        await finalizeGiveaway(guild, messageId, g, { announce: true });
      }
    }
  }
}

async function finalizeGiveaway(guild, messageId, g, { reroll = false, announce = false } = {}) {
  try {
    const channel = guild.channels.cache.get(g.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) throw new Error('Channel missing');
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) throw new Error('Message missing');

    const reaction = msg.reactions.resolve('🎉') || msg.reactions.cache.find(r => r.emoji.name === '🎉');
    const users = reaction ? await reaction.users.fetch() : new Collection();
    const entrants = users.filter(u => !u.bot).map(u => u);
    const winners = chooseRandom(entrants, g.winners);

    const content = winners.length
      ? `${reroll ? '🔁 Rerolled!' : '🎉 Giveaway Ended!'} **${g.prize}**\nWinners: ${winners.map(w => `${w}`).join(', ')}`
      : `No valid entries for **${g.prize}**.`;

    if (announce) await channel.send({ embeds: [greenEmbed('Giveaway Results').setDescription(content)] });

    // Remove from registry if not rerolling again later
    if (!reroll) {
      delete giveaways[guild.id]?.[messageId];
      saveJSON('giveaways.json', giveaways);
    }
  } catch (e) {
    console.warn('Giveaway finalize error:', e.message);
  }
}

// === LEADERBOARDS ===
async function leaderboard(interaction) {
  const type = interaction.options.getString('type', true); // invites|messages
  const guild = interaction.guild;
  const store = type === 'invites' ? inviteCounts[guild.id] || {} : messageCounts[guild.id] || {};
  const entries = Object.entries(store).filter(([id]) => id !== 'VANITY_URL');
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 10);
  const lines = await Promise.all(top.map(async ([id, count], i) => {
    const user = await guild.members.fetch(id).then(m => m.user).catch(() => ({ tag: 'Unknown#0000', id }));
    return `**${i + 1}.** ${user.tag} — ${fmt(count)} ${type}`;
  }));
  if (!lines.length) lines.push('No data yet.');
  const emb = greenEmbed(`${type === 'invites' ? 'Top Inviters' : 'Top Chatters'}`).setDescription(lines.join('\n'));
  await interaction.reply({ embeds: [emb], ephemeral: false });
}

// === LOGIN ===
client.login(process.env.TOKEN);

// === OPTIONAL: Simple safety log on exit ===
process.on('SIGINT', () => { console.log('Saving...'); saveJSON('invites.json', inviteCounts); saveJSON('messages.json', messageCounts); saveJSON('giveaways.json', giveaways); process.exit(0); });
