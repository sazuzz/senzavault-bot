const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { log } = require('../utils/logger')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleremove')
        .setDescription('Remove a role from a user')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Target user').setRequired(true)
        )
        .addRoleOption(opt =>
            opt.setName('role').setDescription('Role to remove').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })
        const targetUser = interaction.options.getUser('user')
        const role = interaction.options.getRole('role')

        let member
        try { member = await interaction.guild.members.fetch(targetUser.id) }
        catch { return interaction.editReply('User not found in this server.') }

        if (!member.roles.cache.has(role.id))
            return interaction.editReply(`${member} does not have the role ${role}.`)

        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position)
            return interaction.editReply(`Role ${role} is above the bot in the hierarchy.`)

        try {
            await member.roles.remove(role)
            log('role_remove', {
                executorId: interaction.user.id, executorUsername: interaction.user.username,
                targetId: member.id, targetUsername: member.user.username,
                roleId: role.id, roleName: role.name
            })
            await interaction.editReply(`Role ${role} removed from ${member}.`)
        } catch {
            await interaction.editReply(`Failed to remove ${role}. Check my permissions.`)
        }
    }
}
