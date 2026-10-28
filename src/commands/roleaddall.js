const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { log } = require('../utils/logger')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleaddall')
        .setDescription('Add a role to all members')
        .addRoleOption(opt =>
            opt.setName('role').setDescription('Role to add').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })
        const role = interaction.options.getRole('role')

        if (role.managed) return interaction.editReply('That role is managed by an integration and cannot be assigned manually.')
        if (role.id === interaction.guild.id) return interaction.editReply('Cannot assign @everyone.')

        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position)
            return interaction.editReply(`Role ${role} is above the bot in the hierarchy. Move the bot role higher in Server Settings â†’ Roles.`)

        await interaction.editReply(`Fetching members and adding role ${role}... this may take a moment.`)

        const members = await interaction.guild.members.fetch()
        let success = 0, failed = 0, skipped = 0

        for (const [, member] of members) {
            if (member.user.bot || member.roles.cache.has(role.id)) { skipped++; continue }
            try { await member.roles.add(role); success++ }
            catch { failed++ }
        }

        const { EmbedBuilder } = require('discord.js')
        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle('Role Added to All Members')
            .addFields(
                { name: 'Role', value: `${role}`, inline: true },
                { name: 'Added', value: `\`${success}\``, inline: true },
                { name: 'Skipped', value: `\`${skipped}\``, inline: true },
                { name: 'Failed', value: `\`${failed}\``, inline: true }
            )
            .setTimestamp()
        log('role_add_all', {
            executorId: interaction.user.id, executorUsername: interaction.user.username,
            roleId: role.id, roleName: role.name,
            extra: `added:${success} failed:${failed}`
        })
        await interaction.editReply({ content: '', embeds: [embed] })
    }
}
