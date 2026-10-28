const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const { getLogs, TYPE_LABELS, TYPE_ICONS } = require('../utils/logger')
const { e } = require('../utils/emojis')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View bot action logs')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('Filter by action type')
                .setRequired(false)
                .addChoices(
                    { name: 'Member Joined', value: 'member_join' },
                    { name: 'Member Left', value: 'member_leave' },
                    { name: 'Member Banned', value: 'member_ban' },
                    { name: 'Member Unbanned', value: 'member_unban' },
                    { name: 'Message Deleted', value: 'message_delete' },
                    { name: 'Message Edited', value: 'message_edit' },
                    { name: 'Role Added', value: 'role_add' },
                    { name: 'Role Removed', value: 'role_remove' },
                    { name: 'Role Added (All)', value: 'role_add_all' },
                    { name: 'Role Removed (All)', value: 'role_remove_all' },
                    { name: 'Auto Role', value: 'auto_role' },
                    { name: 'Ticket Opened', value: 'ticket_open' },
                    { name: 'Ticket Closed', value: 'ticket_close' },
                    { name: 'Ticket Claimed', value: 'ticket_claim' },
                    { name: 'Nickname Changed', value: 'nickname_change' },
                    { name: 'Ticket Deleted', value: 'ticket_delete' },
                    { name: 'Ticket User Added', value: 'ticket_add_user' },
                    { name: 'Ticket User Removed', value: 'ticket_remove_user' },
                    { name: 'Ticket Priority Changed', value: 'ticket_priority' },
                    { name: 'Ticket Renamed', value: 'ticket_rename' }
                )
        )
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Filter by user (executor or target)')
                .setRequired(false)
        )
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Number of entries (max 25, default 10)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const type = interaction.options.getString('type')
        const user = interaction.options.getUser('user')
        const limit = interaction.options.getInteger('limit') ?? 10
        const g = interaction.guild
        const em = (name) => e(g, name)

        const entries = getLogs({ type: type || undefined, targetId: user?.id, limit })

        if (entries.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x5b21b6)
                    .setAuthor({ name: 'Senza Vault — Action Logs', iconURL: g.iconURL({ dynamic: true }) ?? undefined })
                    .setDescription(`${em('info')} No logs found for the given filters.`)
                    .setTimestamp()],
                ephemeral: true
            })
        }

        const lines = entries.map(entry => {
            const ts = `<t:${Math.floor(entry.timestamp / 1000)}:R>`
            const icon = TYPE_ICONS[entry.type] || '•'
            const label = TYPE_LABELS[entry.type] || entry.type
            const executor = entry.executorUsername ? `**${entry.executorUsername}**` : 'system'
            const target = entry.targetUsername ? `\`${entry.targetUsername}\`` : (entry.targetId ? `<@${entry.targetId}>` : null)
            const role = entry.roleName ? `\`@${entry.roleName}\`` : null
            const extra = entry.extra ? ` — ${entry.extra}` : ''

            let detail = executor
            if (target) detail += ` → ${target}`
            if (role) detail += ` ${role}`
            detail += extra

            return `\`${icon}\` **${label}** ${ts}\n  ${detail}`
        })

        const filterParts = [
            type ? `Type: \`${TYPE_LABELS[type]}\`` : null,
            user ? `User: ${user}` : null,
            `Showing \`${entries.length}\` of last 500`
        ].filter(Boolean).join('  •  ')

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({
                name: 'SENZA VAULT — Action Logs',
                iconURL: g.iconURL({ dynamic: true }) ?? undefined
            })
            .setTitle(`${em('senzalogo')} Action Logs`)
            .setDescription(lines.join('\n\n'))
            .addFields({ name: `${em('info')} Filters Applied`, value: filterParts })
            .setFooter({ text: `Senza Vault  •  ${g.name}` })
            .setTimestamp()

        await interaction.reply({ embeds: [embed], ephemeral: true })
    }
}
