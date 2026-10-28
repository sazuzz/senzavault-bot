const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js')
const fs = require('fs')
const path = require('path')
const { log } = require('../utils/logger')
const { e } = require('../utils/emojis')

const COOLDOWN_MS = 30 * 60 * 1000
const purchaseCooldowns = new Map()

const OWNER_ID = process.env.OWNER_ID || '1539317326489329735'
const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'config.json')
const TICKETS_PATH = path.join(__dirname, '..', '..', 'data', 'tickets.json')

const PRODUCTS = {
    fivem:   { label: 'FiveM Cheat',    desc: 'ESP, Aimbot, Misc',          emoji: '🎮', priority: 'medium', color: 0x7c3aed },
    hvh:     { label: 'HvH Script',     desc: 'Resolver, Anti-Aim, Desync', emoji: '⚔️', priority: 'medium', color: 0xed3a3a },
    spoofer: { label: 'HWID Spoofer',   desc: 'Kernel-level bypass',        emoji: '🛡️', priority: 'medium', color: 0x3aeded },
    custom:  { label: 'Custom / Other', desc: 'Describe your request',      emoji: '✨', priority: 'high',   color: 0xedcc3a }
}

const RISK_THRESHOLDS = [
    { days: 7,   label: '🔴 New Account',   note: 'Account under 7 days — extra verification required' },
    { days: 30,  label: '🟡 Young Account', note: 'Account under 30 days' },
]

function getRisk(createdTimestamp) {
    const days = Math.floor((Date.now() - createdTimestamp) / 86400000)
    for (const r of RISK_THRESHOLDS) {
        if (days < r.days) return { ...r, days }
    }
    return { label: '🟢 Normal', note: null, days }
}

function readJson(p, fallback) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function writeJson(p, data) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Send the Senza Vault purchase panel')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to post in (default: current)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') ?? interaction.channel
        const g = interaction.guild
        const em = (name) => e(g, name)

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({
                name: `${em('senzalogo') ? 'SENZA VAULT' : '🔮 SENZA VAULT'} — #1 Software Provider`,
                iconURL: g.iconURL({ dynamic: true, size: 64 }) ?? undefined
            })
            .setTitle(`${em('senzalogo')} Senza Vault — Purchases`)
            .setDescription(
                `**${em('_balistic_info_') || em('info')} How to order**\n` +
                `> ${em('info')} Click **Read TOS** and review our terms first.\n` +
                `> ${em('support')} Click **Purchase** and select your product.\n` +
                `> ${em('staffteam')} Fill out the short form — ticket opens instantly.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**${em('coin')} Products**\n` +
                `> 🎮 **FiveM Cheat** — ESP • Aimbot • Radar • Misc\n` +
                `> ⚔️ **HvH Script** — Resolver • Anti-Aim • Desync\n` +
                `> 🛡️ **HWID Spoofer** — Kernel-level permanent bypass\n` +
                `> ✨ **Custom** — Describe your needs, we build it\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**${em('paypal')} Accepted payments**\n` +
                `> ${em('paypal')} PayPal  •  ${em('ltc')} Crypto  •  ${em('visa')} Stripe  •  ${em('paysafecard')} Paysafecard\n\n` +
                `> ⚠️ All sales are **final**. No refunds.`
            )
            .setImage(process.env.PANEL_BANNER_URL ?? null)
            .setFooter({ text: `Senza Vault • ${g.memberCount.toLocaleString()} members • Click Purchase below` })
            .setTimestamp()

        const ge = (name, fallback) => {
            const found = g.emojis.cache.find(ex => ex.name === name)
                ?? interaction.client.emojis.cache.find(ex => ex.name === name)
            return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('purchase_ticket')
                .setLabel('Purchase')
                .setEmoji(ge('coin', '🛒'))
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('read_tos')
                .setLabel('Read TOS')
                .setEmoji(ge('info', '📋'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel('discord.gg/senzavault')
                .setEmoji(ge('senzalogo', '🔗'))
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/senzavault')
        )

        await channel.send({ embeds: [embed], components: [row] })
        await interaction.reply({ content: `${em('senzalogo')} Panel sent to ${channel}`, ephemeral: true })
    },

    async handleButton(interaction) {
        if (interaction.customId === 'read_tos') {
            const tosCmd = require('./tos')
            return interaction.reply({ embeds: [tosCmd.buildTOSEmbed(interaction.guild)], ephemeral: true })
        }

        if (interaction.customId !== 'purchase_ticket') return

        const user = interaction.user
        const guild = interaction.guild
        const em = (name) => e(guild, name)
        const staffRoleId = process.env.STAFF_ROLE_ID
        const isStaff = user.id === OWNER_ID || (staffRoleId && interaction.member?.roles?.cache?.has(staffRoleId))

        if (!isStaff) {
            const last = purchaseCooldowns.get(user.id)
            if (last && Date.now() - last < COOLDOWN_MS) {
                const mins = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000)
                return interaction.reply({
                    content: `⏳ Cooldown active. Wait **${mins} min** before opening another ticket.`,
                    ephemeral: true
                })
            }
        }

        const existing = guild.channels.cache.find(c => c.topic && c.topic.includes(`user:${user.id}`))
        if (existing) {
            return interaction.reply({
                content: `❌ You already have an open ticket: ${existing}\nClose it first.`,
                ephemeral: true
            })
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('product_select')
            .setPlaceholder('What do you want to buy?')
            .addOptions(
                Object.entries(PRODUCTS).map(([value, p]) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(p.label)
                        .setDescription(p.desc)
                        .setValue(value)
                        .setEmoji(p.emoji)
                )
            )

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`${em('loading') || '🛒'} Select Your Product`)
            .setDescription(
                'Pick your product from the dropdown.\n\n' +
                '> A form will appear for payment method and notes.\n' +
                '> Your private ticket opens immediately after.'
            )
            .setFooter({ text: 'Only visible to you' })

        return interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true
        })
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'product_select') return

        const product = interaction.values[0]
        const p = PRODUCTS[product]
        if (!p) return interaction.reply({ content: '❌ Unknown product.', ephemeral: true })

        const modal = new ModalBuilder()
            .setCustomId(`purchase_modal_${product}`)
            .setTitle(`Purchase — ${p.label}`)

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('payment_method')
                    .setLabel('Payment Method')
                    .setPlaceholder('PayPal / Crypto (BTC/ETH/LTC) / Stripe / Paysafecard')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(60)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('extra_notes')
                    .setLabel('Notes (optional)')
                    .setPlaceholder('Specific requests, questions, promo codes...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(500)
            )
        )

        await interaction.showModal(modal)
    },

    async handleModal(interaction) {
        if (!interaction.customId.startsWith('purchase_modal_')) return

        await interaction.deferReply({ ephemeral: true })

        const product = interaction.customId.replace('purchase_modal_', '')
        const p = PRODUCTS[product]
        if (!p) return interaction.editReply('❌ Unknown product.')

        const paymentMethod = interaction.fields.getTextInputValue('payment_method')
        const extraNotes = interaction.fields.getTextInputValue('extra_notes') || null

        const guild = interaction.guild
        const user = interaction.user
        const member = interaction.member
        const em = (name) => e(guild, name)
        const staffRoleId = process.env.STAFF_ROLE_ID
        const isStaff = user.id === OWNER_ID || (staffRoleId && member?.roles?.cache?.has(staffRoleId))

        const categoryId = process.env.TICKET_CATEGORY_ID
        const botId = guild.members.me.id
        const openedTs = Math.floor(Date.now() / 1000)

        const permissionOverwrites = [
            { id: guild.id, type: 0, deny: ['ViewChannel'] },
            { id: user.id, type: 1, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
            { id: OWNER_ID, type: 1, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles'] },
            { id: botId, type: 1, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'ManageChannels', 'AttachFiles'] }
        ]
        if (staffRoleId) {
            permissionOverwrites.push({
                id: staffRoleId,
                type: 0,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles']
            })
        }

        const config = readJson(CONFIG_PATH, { autoRoleId: null, ticketCounter: 0 })
        const nextNum = (config.ticketCounter || 0) + 1
        const ticketNum = String(nextNum).padStart(4, '0')

        let channel
        try {
            channel = await guild.channels.create({
                name: `purchase-${ticketNum}`,
                type: 0,
                parent: categoryId || null,
                topic: `purchase:${product} | user:${user.id} | priority:${p.priority} | opened:<t:${openedTs}:f>`,
                permissionOverwrites
            })
            config.ticketCounter = nextNum
            writeJson(CONFIG_PATH, config)

            const tickets = readJson(TICKETS_PATH, {})
            tickets[channel.id] = {
                number: ticketNum,
                typeLabel: `Purchase — ${p.label}`,
                priority: p.priority,
                userId: user.id,
                username: user.username,
                openedAt: Date.now(),
                claimedBy: null,
                claimedByUsername: null,
                product,
                paymentMethod,
                extraNotes
            }
            writeJson(TICKETS_PATH, tickets)

            if (!isStaff) purchaseCooldowns.set(user.id, Date.now())
        } catch {
            return interaction.editReply(
                '❌ Could not create ticket channel.\n' +
                '**Fix:** Server Settings → Roles → drag **Senza Vault** role above all others. Bot needs **Manage Channels**.'
            )
        }

        const risk = getRisk(user.createdTimestamp)
        const joinDays = Math.floor((Date.now() - (member?.joinedTimestamp || Date.now())) / 86400000)

        const ticketEmbed = new EmbedBuilder()
            .setColor(p.color)
            .setAuthor({
                name: `${p.emoji} Purchase #${ticketNum} — ${p.label}`,
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(
                `Welcome ${user}.\n` +
                `${em('staffteam')} Staff will assist you shortly.\n\n` +
                `**Order Summary**\n` +
                `> ${p.emoji} **Product:** ${p.label}\n` +
                `> 💳 **Payment:** ${paymentMethod}\n` +
                (extraNotes ? `> 📝 **Notes:** ${extraNotes}\n` : '')
            )
            .addFields(
                { name: `${em('userslogo')} User`, value: `${user}\n\`${user.id}\``, inline: true },
                { name: `${em('coin')} Ticket`, value: `\`#${ticketNum}\``, inline: true },
                { name: `${em('boost')} Opened`, value: `<t:${openedTs}:R>`, inline: true },
                { name: '🔒 Risk', value: risk.label, inline: true },
                { name: '📅 Account Age', value: `\`${risk.days}d\``, inline: true },
                { name: '🏠 In Server', value: `\`${joinDays}d\``, inline: true }
            )
            .setFooter({ text: 'Senza Vault  •  Claim → Close → Delete' })
            .setTimestamp()

        if (risk.note) {
            ticketEmbed.addFields({ name: `${em('eyesshaking') || '⚠️'} Risk Notice`, value: `> ${risk.note}`, inline: false })
        }

        const ge = (name, fallback) => {
            const found = guild.emojis.cache.find(ex => ex.name === name)
                ?? interaction.client.emojis.cache.find(ex => ex.name === name)
            return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
        }
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setEmoji(ge('verified', '✅')).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setEmoji(ge('mop', '🗑️')).setStyle(ButtonStyle.Secondary)
        )

        const staffPing = staffRoleId ? `<@&${staffRoleId}>` : `<@${OWNER_ID}>`
        await channel.send({
            content: `${staffPing} — ${p.emoji} **${p.label}** from ${user} | paying via **${paymentMethod}**`,
            embeds: [ticketEmbed],
            components: [actionRow]
        })

        log('ticket_open', {
            executorId: user.id, executorUsername: user.username,
            targetId: user.id, targetUsername: user.username,
            extra: `ticket #${ticketNum} type:Purchase product:${product} payment:${paymentMethod} channel:${channel.id}`
        })

        return interaction.editReply(`${em('senzalogo')} Ticket created: ${channel} — **#${ticketNum}**`)
    }
}
