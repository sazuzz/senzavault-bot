require('dotenv').config()
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js')
const { setClient } = require('./src/utils/logger')
const { setClient: setEmojiClient } = require('./src/utils/emojis')
const fs = require('fs')
const path = require('path')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.GuildMember, Partials.Message, Partials.Channel]
})

client.commands = new Collection()

const commandsPath = path.join(__dirname, 'src', 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file))
    if (cmd.data) client.commands.set(cmd.data.name, cmd)
}

const eventsPath = path.join(__dirname, 'src', 'events')
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))
for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file))
    const wrapped = (...args) => {
        try {
            const result = event.execute(...args)
            if (result && typeof result.catch === 'function') result.catch(err => console.error(`[EVENT:${event.name}]`, err))
        } catch (err) {
            console.error(`[EVENT:${event.name}]`, err)
        }
    }
    if (event.once) client.once(event.name, wrapped)
    else client.on(event.name, wrapped)
}

const OWNER_ID = process.env.OWNER_ID || '1539317326489329735'
const ALLOWED_GUILD_ID = process.env.ALLOWED_GUILD_ID || '1554899954487795832'

async function safeCall(fn, interaction) {
    try {
        await fn()
    } catch (err) {
        console.error(err)
        const msg = { content: '❌ Something went wrong.', ephemeral: true }
        if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {})
        else interaction.reply(msg).catch(() => {})
    }
}

client.on('interactionCreate', async interaction => {
    if (interaction.guildId && interaction.guildId !== ALLOWED_GUILD_ID) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: 'This bot is not authorized in this server.', ephemeral: true })
        }
        return
    }

    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: 'You do not have permission to use this bot.', ephemeral: true })
        }
        const cmd = client.commands.get(interaction.commandName)
        if (!cmd) return
        return safeCall(() => cmd.execute(interaction), interaction)
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_select') {
            const tsCmd = client.commands.get('ticketsetup')
            if (tsCmd?.handleSelect) return safeCall(() => tsCmd.handleSelect(interaction), interaction)
        }
        if (interaction.customId === 'product_select') {
            const panelCmd = client.commands.get('panel')
            if (panelCmd?.handleSelectMenu) return safeCall(() => panelCmd.handleSelectMenu(interaction), interaction)
        }
        return
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('purchase_modal_')) {
            const panelCmd = client.commands.get('panel')
            if (panelCmd?.handleModal) return safeCall(() => panelCmd.handleModal(interaction), interaction)
        }
        return
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'gw_enter' || interaction.customId === 'gw_entries') {
            const gwCmd = client.commands.get('giveaway')
            if (gwCmd?.handleButton) return safeCall(() => gwCmd.handleButton(interaction), interaction)
            return
        }

        if (['claim_ticket', 'close_ticket', 'delete_ticket'].includes(interaction.customId)) {
            const tsCmd = client.commands.get('ticketsetup')
            if (tsCmd?.handleButton) return safeCall(() => tsCmd.handleButton(interaction), interaction)
            return
        }

        if (interaction.customId.startsWith('ticket_rate_')) {
            const tsCmd = client.commands.get('ticketsetup')
            if (tsCmd?.handleRating) return safeCall(() => tsCmd.handleRating(interaction), interaction)
            return
        }

        if (interaction.customId.startsWith('booster_lang_')) {
            const boosterCmd = client.commands.get('booster')
            if (boosterCmd?.handleButton) return safeCall(() => boosterCmd.handleButton(interaction), interaction)
            return
        }

        if (interaction.customId.startsWith('splus_lang_')) {
            const splusCmd = client.commands.get('splus')
            if (splusCmd?.handleButton) return safeCall(() => splusCmd.handleButton(interaction), interaction)
            return
        }

        if (
            interaction.customId.startsWith('access_lang_') ||
            interaction.customId === 'access_buy' ||
            interaction.customId === 'access_claim_free'
        ) {
            const accessCmd = client.commands.get('access')
            if (accessCmd?.handleButton) return safeCall(() => accessCmd.handleButton(interaction), interaction)
            return
        }

        if (interaction.customId === 'drop_claim') {
            const dropCmd = client.commands.get('drop')
            if (dropCmd?.handleButton) return safeCall(() => dropCmd.handleButton(interaction), interaction)
            return
        }

        const panelCmd = client.commands.get('panel')
        if (panelCmd?.handleButton) return safeCall(() => panelCmd.handleButton(interaction), interaction)
    }
})

client.once('clientReady', () => {
    setClient(client)
    setEmojiClient(client)
    const gwCmd = client.commands.get('giveaway')
    if (gwCmd?.restoreTimers) gwCmd.restoreTimers(client)
    console.log(`[Senza Vault] Logged in as ${client.user.tag}`)
    console.log(`Commands loaded: ${client.commands.size}`)
})

process.on('unhandledRejection', err => console.error('[CRASH] Unhandled rejection:', err))
process.on('uncaughtException', err => console.error('[CRASH] Uncaught exception:', err))

client.on('error', err => console.error('[WS] Discord client error:', err))
client.on('warn', msg => console.warn('[WS] Warning:', msg))
client.on('shardDisconnect', (event, shardId) => {
    console.warn(`[WS] Shard ${shardId} disconnected (code ${event.code}), reconnecting...`)
})
client.on('shardReconnecting', shardId => console.log(`[WS] Shard ${shardId} reconnecting...`))
client.on('shardResume', shardId => console.log(`[WS] Shard ${shardId} resumed`))

client.login(process.env.TOKEN)
