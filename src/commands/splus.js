const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js')
const { e } = require('../utils/emojis')

const PRICE_EUR = '€25.00'
const PRICE_BRL = 'R$155,00'
const PRICE_USD = '$27.00'

function buildSplusEmbed(guild, lang) {
    const em = (name) => e(guild, name)
    const logo    = em('senzalogo')
    const boost   = em('boost')
    const info    = em('_balistic_info_') || em('info')
    const support = em('support')
    const staff   = em('staffteam')
    const star    = em('star')
    const coin    = em('coin')
    const admin   = em('admin')
    const verify  = em('verified')
    const bugsu   = em('bugsu')

    const products =
        `> ${boost} **Fortnite** — Sources, bypasses & methods\n` +
        `> ${coin} **FiveM** — Sources, bypasses & methods\n` +
        `> ${star} **Valorant** — Sources, bypasses & methods\n` +
        `> ${admin} **Rust** — Sources & methods\n` +
        `> ${verify} **Minecraft** — Sources & exploits\n` +
        `> ${bugsu} **IMGUIs** — Custom menus & overlays\n` +
        `> ${info} **Methods** — Private working methods\n` +
        `> ${staff} **Spoofers** — HWID & hardware bypass`

    const TEXTS = {
        es: {
            title: `${star} S+ Tier — El Mejor del Mercado`,
            desc:
                `> ${logo} **El tier más exclusivo de Senza Vault.**\n` +
                `> ${star} Acceso a los mejores sources y métodos del mercado.\n` +
                `> ${admin} Plazas muy limitadas — actúa rápido.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin} Precio`,
            price:
                `> ${logo} Europa — **${PRICE_EUR}**\n` +
                `> ${coin} Brasil — **${PRICE_BRL}**\n` +
                `> ${star} USA — **${PRICE_USD}**`,
            prod_name: `${boost} Qué incluye S+`,
            products,
            how_name: `${info} ¿Cómo obtenerlo?`,
            how: `${support} Abre un ticket en <#1562820827987185744> y el equipo te guía con los métodos de pago. ${verify} Acceso activo en minutos.`,
            footer: 'Senza Vault  •  S+ — Donde los mejores juegan',
        },
        en: {
            title: `${star} S+ Tier — The Best on the Market`,
            desc:
                `> ${logo} **The most exclusive tier at Senza Vault.**\n` +
                `> ${star} Access to the best sources and methods on the market.\n` +
                `> ${admin} Very limited spots — act fast.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin} Pricing`,
            price:
                `> ${logo} Europe — **${PRICE_EUR}**\n` +
                `> ${coin} Brazil — **${PRICE_BRL}**\n` +
                `> ${star} USA — **${PRICE_USD}**`,
            prod_name: `${boost} What S+ Includes`,
            products,
            how_name: `${info} How to get it?`,
            how: `${support} Open a ticket in <#1562820827987185744> and the team will guide you through payment. ${verify} Access active within minutes.`,
            footer: 'Senza Vault  •  S+ — Where the best play',
        },
        pt: {
            title: `${star} S+ Tier — O Melhor do Mercado`,
            desc:
                `> ${logo} **O tier mais exclusivo da Senza Vault.**\n` +
                `> ${star} Acesso aos melhores sources e métodos do mercado.\n` +
                `> ${admin} Vagas muito limitadas — aja rápido.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            price_name: `${coin} Preços`,
            price:
                `> ${logo} Europa — **${PRICE_EUR}**\n` +
                `> ${coin} Brasil — **${PRICE_BRL}**\n` +
                `> ${star} USA — **${PRICE_USD}**`,
            prod_name: `${boost} O que inclui o S+`,
            products,
            how_name: `${info} Como obter?`,
            how: `${support} Abra um ticket em <#1562820827987185744> e a equipe te guia nos métodos de pagamento. ${verify} Acesso ativo em minutos.`,
            footer: 'Senza Vault  •  S+ — Onde os melhores jogam',
        },
    }

    const t = TEXTS[lang]
    return new EmbedBuilder()
        .setColor(0xf1c40f)
        .setAuthor({
            name: 'SENZA VAULT — S+ Tier',
            iconURL: guild?.iconURL({ dynamic: true, size: 64 }) ?? undefined
        })
        .setTitle(t.title)
        .setDescription(t.desc)
        .addFields(
            { name: t.price_name, value: t.price },
            { name: t.prod_name,  value: t.products },
            { name: t.how_name,   value: t.how },
        )
        .setFooter({ text: t.footer })
        .setTimestamp()
}

const LANG_ROW = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('splus_lang_es').setLabel('Español').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('splus_lang_en').setLabel('English').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('splus_lang_pt').setLabel('Português (BR)').setStyle(ButtonStyle.Secondary),
)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('splus')
        .setDescription('Post the S+ tier panel')
        .addStringOption(opt =>
            opt.setName('lang')
                .setDescription('Initial language')
                .setRequired(true)
                .addChoices(
                    { name: 'Español', value: 'es' },
                    { name: 'English', value: 'en' },
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
        const lang   = interaction.options.getString('lang')
        const g      = interaction.guild

        await interaction.deferReply({ flags: 64 })

        await postCh.send({ embeds: [buildSplusEmbed(g, lang)], components: [LANG_ROW] })

        const em = (name) => e(g, name)
        await interaction.editReply({ content: `${em('senzalogo')} S+ panel sent to ${postCh}` })
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('splus_lang_')) return
        const lang = interaction.customId.split('_')[2]
        await interaction.update({ embeds: [buildSplusEmbed(interaction.guild, lang)], components: [LANG_ROW] })
    }
}
