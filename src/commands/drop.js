const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require('discord.js')
const { e } = require('../utils/emojis')
const { log } = require('../utils/logger')

// msgId → prize string (active drops only)
const activeDrops = new Map()

function buildDropEmbed(guild, prize, claimed, winner) {
    const em = (name) => e(guild, name)
    return new EmbedBuilder()
        .setColor(claimed ? 0x5b21b6 : 0x7c3aed)
        .setAuthor({
            name: 'SENZA VAULT — DROP',
            iconURL: guild.iconURL({ dynamic: true }) ?? undefined
        })
        .setTitle(`${em('star') || '⭐'} ${prize}`)
        .setDescription(
            claimed
                ? `${em('boost') || '🏆'} **Claimed by ${winner}!**\n\n━━━━━━━━━━━━━━━━━━━━━━━━`
                : `${em('senzalogo') || '🎁'} **First to click claims the prize!**\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n> ${em('boost') || '⚡'} Be fast — only one winner.`
        )
        .setFooter({
            text: claimed
                ? 'Drop claimed  •  Senza Vault'
                : 'Senza Vault  •  #1 Software Provider'
        })
        .setTimestamp()
}

function buildDropRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('drop_claim')
            .setLabel(disabled ? 'Claimed!' : 'Claim')
            .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setDisabled(disabled)
    )
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Drop a prize — first click wins')
        .addStringOption(opt =>
            opt.setName('prize')
                .setDescription('What are you dropping?')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to post in (default: current)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const prize = interaction.options.getString('prize')
        const postCh = interaction.options.getChannel('channel') ?? interaction.channel
        const g = interaction.guild
        const em = (name) => e(g, name)

        await interaction.deferReply({ ephemeral: true })

        const embed = buildDropEmbed(g, prize, false, null)
        const msg = await postCh.send({ embeds: [embed], components: [buildDropRow(false)] })

        activeDrops.set(msg.id, prize)

        await interaction.editReply(
            `${em('senzalogo')} Drop posted in ${postCh}!\nPrize: **${prize}**`
        )
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'drop_claim') return

        const msgId = interaction.message.id
        if (!activeDrops.has(msgId)) {
            return interaction.reply({ content: 'Already claimed!', ephemeral: true })
        }

        // Delete first — blocks any concurrent click from also winning
        const prize = activeDrops.get(msgId)
        activeDrops.delete(msgId)

        const g = interaction.guild
        const winner = interaction.user
        const em = (name) => e(g, name)

        await interaction.message.edit({
            embeds: [buildDropEmbed(g, prize, true, winner)],
            components: [buildDropRow(true)]
        })

        await interaction.reply({
            content: `${em('boost') || '🏆'} ${winner} claimed **${prize}**! Congrats! ${em('senzalogo') || '🎉'}`
        })

        log('role_add', {
            executorId: null,
            executorUsername: 'Drop',
            targetId: winner.id,
            targetUsername: winner.username,
            extra: `claimed drop "${prize}" msgId:${msgId}`
        })
    }
}
