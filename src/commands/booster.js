const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js')
const { e } = require('../utils/emojis')

function buildBoosterEmbed(guild, lang, boosterCh) {
    const em = (name) => e(guild, name)
    const logo    = em('senzalogo')
    const boost   = em('boost')
    const info    = em('_balistic_info_') || em('info')
    const support = em('support')
    const staff   = em('staffteam')
    const star    = em('star')
    const verify  = em('verified')
    const users   = em('userslogo')
    const link    = boosterCh ? boosterCh.toString() : '**#boosters**'

    const TEXTS = {
        es: {
            title: `${boost} Canal Exclusivo Boosters`,
            desc:
                `> ${logo} **¿Quieres acceder al canal exclusivo de Boosters?**\n` +
                `> ${boost} Solo tienes que darle boost al servidor — es así de fácil.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            steps_name: `${info} Pasos`,
            steps:
                `${boost} Ve al nombre del servidor y haz clic en él\n` +
                `${star} Selecciona **"Boostear Servidor"**\n` +
                `${verify} Confirma el boost\n` +
                `${logo} Acceso a ${link} asignado **automáticamente**`,
            perks_name: `${star} Qué obtienes`,
            perks:
                `> ${boost} Acceso al canal exclusivo ${link}\n` +
                `> ${users} Rol **Booster** visible en el servidor\n` +
                `> ${support} Soporte prioritario con el equipo\n` +
                `> ${staff} Sneak peeks y previews de actualizaciones\n` +
                `> ${logo} Acceso anticipado a nuevas features\n` +
                `> ${star} Chat directo con el equipo de desarrollo`,
            note_name: `${info} Nota`,
            note: `Si en 5 minutos no tienes el rol, abre un ticket en <#1562820827987185744> y te lo asignamos al momento.`,
            footer: 'Senza Vault  •  Gracias por apoyar el servidor',
        },
        en: {
            title: `${boost} Exclusive Boosters Channel`,
            desc:
                `> ${logo} **Want access to the exclusive Boosters channel?**\n` +
                `> ${boost} Just boost the server — it's that easy.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            steps_name: `${info} Steps`,
            steps:
                `${boost} Go to the server name and click on it\n` +
                `${star} Select **"Boost Server"**\n` +
                `${verify} Confirm the boost\n` +
                `${logo} Access to ${link} assigned **automatically**`,
            perks_name: `${star} What you get`,
            perks:
                `> ${boost} Access to the exclusive ${link} channel\n` +
                `> ${users} **Booster** role visible on the server\n` +
                `> ${support} Priority support with the team\n` +
                `> ${staff} Sneak peeks and update previews\n` +
                `> ${logo} Early access to new features\n` +
                `> ${star} Direct chat with the dev team`,
            note_name: `${info} Note`,
            note: `If you don't have the role in 5 minutes, open a ticket in <#1562820827987185744> and we'll assign it right away.`,
            footer: 'Senza Vault  •  Thanks for supporting the server',
        },
        pt: {
            title: `${boost} Canal Exclusivo Boosters`,
            desc:
                `> ${logo} **Quer acesso ao canal exclusivo de Boosters?**\n` +
                `> ${boost} Só dê boost no servidor — é simples assim.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
            steps_name: `${info} Passos`,
            steps:
                `${boost} Vá ao nome do servidor e clique nele\n` +
                `${star} Selecione **"Impulsionar Servidor"**\n` +
                `${verify} Confirme o boost\n` +
                `${logo} Acesso ao ${link} atribuído **automaticamente**`,
            perks_name: `${star} O que você ganha`,
            perks:
                `> ${boost} Acesso ao canal exclusivo ${link}\n` +
                `> ${users} Cargo **Booster** visível no servidor\n` +
                `> ${support} Suporte prioritário com a equipe\n` +
                `> ${staff} Sneak peeks e prévias de atualizações\n` +
                `> ${logo} Acesso antecipado a novas features\n` +
                `> ${star} Chat direto com a equipe de desenvolvimento`,
            note_name: `${info} Nota`,
            note: `Se em 5 minutos não tiver o cargo, abra um ticket em <#1562820827987185744> e atribuímos na hora.`,
            footer: 'Senza Vault  •  Obrigado por apoiar o servidor',
        },
    }

    const t = TEXTS[lang]
    return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setAuthor({
            name: 'SENZA VAULT — Booster Access',
            iconURL: guild?.iconURL({ dynamic: true, size: 64 }) ?? undefined
        })
        .setTitle(t.title)
        .setDescription(t.desc)
        .addFields(
            { name: t.steps_name, value: t.steps },
            { name: t.perks_name, value: t.perks },
            { name: t.note_name, value: t.note },
        )
        .setFooter({ text: t.footer })
        .setTimestamp()
}

function buildLangRow(chId) {
    const id = chId ?? '0'
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`booster_lang_es_${id}`)
            .setLabel('Español')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`booster_lang_en_${id}`)
            .setLabel('English')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`booster_lang_pt_${id}`)
            .setLabel('Português (BR)')
            .setStyle(ButtonStyle.Secondary),
    )
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('booster')
        .setDescription('Post the Booster channel access panel')
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
            opt.setName('booster_channel')
                .setDescription('The actual booster channel to link in the embed')
                .setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to post in (default: current)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const postCh     = interaction.options.getChannel('channel') ?? interaction.channel
        const boosterCh  = interaction.options.getChannel('booster_channel') ?? null
        const lang       = interaction.options.getString('lang')
        const g          = interaction.guild

        await interaction.deferReply({ flags: 64 })

        const embed = buildBoosterEmbed(g, lang, boosterCh)
        const row   = buildLangRow(boosterCh?.id)

        await postCh.send({ embeds: [embed], components: [row] })

        const em = (name) => e(g, name)
        await interaction.editReply({ content: `${em('senzalogo')} Booster panel sent to ${postCh}` })
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('booster_lang_')) return

        const parts  = interaction.customId.split('_')
        const lang   = parts[2]          // es | en | pt
        const chId   = parts[3]          // channel id or '0'
        const g      = interaction.guild
        let boosterCh = null
        if (chId && chId !== '0') {
            boosterCh = g.channels.cache.get(chId) ?? null
        }

        const embed = buildBoosterEmbed(g, lang, boosterCh)
        const row   = buildLangRow(chId !== '0' ? chId : null)

        await interaction.update({ embeds: [embed], components: [row] })
    }
}
