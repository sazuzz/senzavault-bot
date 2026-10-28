const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { log } = require('../utils/logger')
const fs = require('fs')
const path = require('path')

const configPath = path.join(__dirname, '..', '..', 'data', 'config.json')

function getConfig() {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    catch { return { autoRoleId: null } }
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoroleadd')
        .setDescription('Set or remove the auto-role assigned to new members')
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('Role to auto-assign (empty = disable)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const role = interaction.options.getRole('role')
        const config = getConfig()

        if (!role) {
            config.autoRoleId = null
            saveConfig(config)
            return interaction.reply({ content: 'Auto-role disabled.', ephemeral: true })
        }

        if (role.managed) return interaction.reply({ content: 'That role is managed by an integration and cannot be assigned.', ephemeral: true })
        if (role.id === interaction.guild.id) return interaction.reply({ content: 'Cannot use @everyone as auto-role.', ephemeral: true })

        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position)
            return interaction.reply({ content: `Role ${role} is above the bot in the hierarchy. Move the bot role higher in Server Settings â†’ Roles.`, ephemeral: true })

        config.autoRoleId = role.id
        saveConfig(config)
        log('auto_role', {
            executorId: interaction.user.id, executorUsername: interaction.user.username,
            roleId: role.id, roleName: role.name
        })
        return interaction.reply({ content: `Auto-role set to ${role}. Every new member will receive it on join.`, ephemeral: true })
    }
}
