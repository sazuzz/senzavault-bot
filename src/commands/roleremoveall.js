const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { log } = require('../utils/logger')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleremoveall')
        .setDescription('Remove a role from all members')
        .addRoleOption(opt =>
            opt.setName('rol').setDescription('Role to remove').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })
        const role = interaction.options.getRole('rol')

        if (role.managed) return interaction.editReply('That role is managed by an integration.')
        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position)
            return interaction.editReply(`Role ${role} is above the bot in the hierarchy.`)

        await interaction.editReply(`Removing role ${role} from all members...`)

        const members = await interaction.guild.members.fetch()
        let success = 0, failed = 0, skipped = 0

        for (const [, member] of members) {
            if (member.user.bot || !member.roles.cache.has(role.id)) { skipped++; continue }
            try { await member.roles.remove(role); success++ }
            catch { failed++ }
        }

        const { EmbedBuilder } = require('discord.js')
        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle('Role Removed from All Members')
            .addFields(
                { name: 'Role', value: `${role}`, inline: true },
                { name: 'Removed', value: `\`${success}\``, inline: true },
                { name: 'Skipped', value: `\`${skipped}\``, inline: true },
                { name: 'Failed', value: `\`${failed}\``, inline: true }
            )
            .setTimestamp()
        log('role_remove_all', {
            executorId: interaction.user.id, executorUsername: interaction.user.username,
            roleId: role.id, roleName: role.name,
            extra: `removed:${success} failed:${failed}`
        })
        await interaction.editReply({ content: '', embeds: [embed] })
    }
}
