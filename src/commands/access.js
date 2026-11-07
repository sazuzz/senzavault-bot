const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js')
const { e } = require('../utils/emojis')

const TICKET_CH = process.env.TICKET_CHANNEL_ID || '1562820827987185744'

function buildAccessEmbed(guild, lang) {
    const em = (name) => e(guild, name)
    const logo   = em('senzalogo')
    const coin   = em('coin')
    const ltc    = em('ltc')
    const info   = em('info')
    const verify = em('verified')
    const support = em('support')

    const prices = {
        es: ['1 Día — **3€**', '1 Semana — **5€**', '1 Mes — **10€**', 'Vitalicio — **15€**'],
        en: ['1 Day — **3€**',  '1 Week — **5€**',   '1 Month — **10€**', 'Lifetime — **15€**'],
        pt: ['1 Dia — **3€**',  '1 Semana — **5€**', '1 Mês — **10€**',   'Vitalício — **15€**'],
    }

    const TEXTS = {
        es: {
            title:
                `${ltc || '🪙'} Acceso — Compra con Litecoin ${ltc || '🪙'}`,
            subtitle:
                `> ${logo} **Acceso temporal a Senza Vault, pagado en Litecoin (LTC).**\n` +
                `> ${coin} Entrega rápida — acceso activo en minutos.\n` +
                `> ${verify} Seguro, privado y sin complicaciones.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin || '💰'} Precios`,
            price:      prices.es.map(p => `> ${coin || '💰'} ${p}`).join('\n'),
            how_name:   `${info || '📋'} ¿Cómo comprar?`,
            how:
                `${support || '🎫'} Haz clic en **Comprar** abajo o abre un ticket en <#${TICKET_CH}>.\n` +
                `${verify || '✅'} El equipo te guía con el pago y activa tu acceso al instante.`,
            footer: 'Senza Vault  •  discord.gg/senzavault',
        },
        en: {
            title:
                `${ltc || '🪙'} Access — Buy with Litecoin ${ltc || '🪙'}`,
            subtitle:
                `> ${logo} **Temporary access to Senza Vault, paid in Litecoin (LTC).**\n` +
                `> ${coin} Fast delivery — access active within minutes.\n` +
                `> ${verify} Secure, private, no hassle.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin || '💰'} Prices`,
            price:      prices.en.map(p => `> ${coin || '💰'} ${p}`).join('\n'),
            how_name:   `${info || '📋'} How to buy?`,
            how:
                `${support || '🎫'} Click **Buy** below or open a ticket in <#${TICKET_CH}>.\n` +
                `${verify || '✅'} Staff will guide you through payment and activate access instantly.`,
            footer: 'Senza Vault  •  discord.gg/senzavault',
        },
        pt: {
            title:
                `${ltc || '🪙'} Acesso — Compre com Litecoin ${ltc || '🪙'}`,
            subtitle:
                `> ${logo} **Acesso temporário à Senza Vault, pago em Litecoin (LTC).**\n` +
                `> ${coin} Entrega rápida — acesso ativo em minutos.\n` +
                `> ${verify} Seguro, privado e sem complicações.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin || '💰'} Preços`,
            price:      prices.pt.map(p => `> ${coin || '💰'} ${p}`).join('\n'),
            how_name:   `${info || '📋'} Como comprar?`,
            how:
                `${support || '🎫'} Clique em **Comprar** abaixo ou abra um ticket em <#${TICKET_CH}>.\n` +
                `${verify || '✅'} A equipe vai te guiar no pagamento e ativar o acesso na hora.`,
            footer: 'Senza Vault  •  discord.gg/senzavault',
        },
    }

    const t = TEXTS[lang]
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({
            name: 'SENZA VAULT  •  discord.gg/senzavault',
            iconURL: guild?.iconURL({ dynamic: true, size: 64 }) ?? undefined,
            url: 'https://discord.gg/senzavault'
        })
        .setTitle(t.title)
        .setDescription(t.subtitle)
        .addFields(
            { name: t.price_name, value: t.price },
            { name: t.how_name,   value: t.how },
        )
        .setFooter({
            text: t.footer,
            iconURL: guild?.iconURL({ dynamic: true, size: 32 }) ?? undefined
        })
        .setTimestamp()
}

function buildComponents(guild, client, lang) {
    const labels = {
        es: { buy: 'Comprar', claim: 'Reclamar OG Role' },
        en: { buy: 'Buy',     claim: 'Claim OG Role' },
        pt: { buy: 'Comprar', claim: 'Reivindicar OG Role' },
    }
    const t = labels[lang]

    const gef = (name, fallback) => {
        const found = guild?.emojis?.cache?.find(ex => ex.name === name)
            ?? client?.emojis?.cache?.find(ex => ex.name === name)
        return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
    }

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('access_buy')
            .setLabel(t.buy)
            .setEmoji(gef('coin', '🛒'))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('access_claim_free')
            .setLabel(t.claim)
            .setEmoji(gef('boost', '🎁'))
            .setStyle(ButtonStyle.Primary),
    )

    const langRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('access_lang_es').setLabel('Español').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('access_lang_en').setLabel('English').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('access_lang_pt').setLabel('Português (BR)').setStyle(ButtonStyle.Secondary),
    )

    return [actionRow, langRow]
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('access')
        .setDescription('Post the LTC access purchase panel')
        .addStringOption(opt =>
            opt.setName('lang')
                .setDescription('Initial language')
                .setRequired(false)
                .addChoices(
                    { name: 'Español',        value: 'es' },
                    { name: 'English',        value: 'en' },
                    { name: 'Português (BR)', value: 'pt' },
                )
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to post in (default: current)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const postCh = interaction.options.getChannel('channel') ?? interaction.channel
        const lang   = interaction.options.getString('lang') ?? 'es'
        const g      = interaction.guild

        await interaction.deferReply({ flags: 64 })

        await postCh.send({
            embeds: [buildAccessEmbed(g, lang)],
            components: buildComponents(g, interaction.client, lang)
        })

        const em = (name) => e(g, name)
        await interaction.editReply({ content: `${em('senzalogo') || '🔮'} Access panel sent to ${postCh}` })
    },

    async handleButton(interaction) {
        const g = interaction.guild
        const em = (name) => e(g, name)

        if (interaction.customId.startsWith('access_lang_')) {
            const lang = interaction.customId.split('_')[2]
            return interaction.update({
                embeds: [buildAccessEmbed(g, lang)],
                components: buildComponents(g, interaction.client, lang)
            })
        }

        if (interaction.customId === 'access_buy') {
            const ltc  = em('ltc')
            const coin = em('coin')
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x7c3aed)
                        .setTitle(`${ltc || '🪙'} Purchase Access`)
                        .setDescription(
                            `**Send LTC to:**\n` +
                            `\`\`\`${process.env.LTC_ADDRESS || 'Configure LTC_ADDRESS in .env'}\`\`\`` +
                            `\n**Prices:**\n` +
                            `${coin || '💰'} 1 Day / 1 Día / 1 Dia → **3€**\n` +
                            `${coin || '💰'} 1 Week / 1 Semana → **5€**\n` +
                            `${coin || '💰'} 1 Month / 1 Mes / 1 Mês → **10€**\n` +
                            `${coin || '💰'} Lifetime / Vitalicio / Vitalício → **15€**\n\n` +
                            `After paying, open a ticket in <#${TICKET_CH}> with your **TX hash**.`
                        )
                        .setFooter({ text: 'Senza Vault  •  discord.gg/senzavault' })
                ],
                ephemeral: true
            })
        }

        if (interaction.customId === 'access_claim_free') {
            const ogRoleId   = process.env.OG_ROLE_ID
            const hasOgRole  = ogRoleId && interaction.member?.roles?.cache?.has(ogRoleId)
            const isBoosting = interaction.member?.premiumSince != null

            if (!hasOgRole && !isBoosting) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xed3a3a)
                            .setTitle('❌ Sin OG Role / No OG Role / Sem OG Role')
                            .setDescription(
                                `**ES:** No tienes el OG Role aún. Boostea el servidor para ganarlo.\n` +
                                `**EN:** You don't have the OG Role yet. Boost the server to earn it.\n` +
                                `**PT:** Você ainda não tem o OG Role. Impulsione o servidor para obtê-lo.\n\n` +
                                `Desde **3€/día** → <#${TICKET_CH}>`
                            )
                            .setFooter({ text: 'Senza Vault  •  discord.gg/senzavault' })
                    ],
                    ephemeral: true
                })
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle(`${em('verified') || '✅'} OG Role detectado!`)
                        .setDescription(
                            `**ES:** Tienes el OG Role. Abre un ticket en <#${TICKET_CH}> y el staff te activa el acceso.\n` +
                            `**EN:** You have the OG Role. Open a ticket in <#${TICKET_CH}> and staff will activate your access.\n` +
                            `**PT:** Você tem o OG Role. Abra um ticket em <#${TICKET_CH}> e a equipe ativa seu acesso.`
                        )
                        .setFooter({ text: 'Senza Vault  •  discord.gg/senzavault' })
                ],
                ephemeral: true
            })
        }
    }
}
