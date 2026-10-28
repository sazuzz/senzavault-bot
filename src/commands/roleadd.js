const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const { log } = require('../utils/logger')
const { e } = require('../utils/emojis')

const timers = new Map()

function parseTime(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return null
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    return parseInt(match[1]) * units[match[2]]
}

function formatDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return str
    const n = parseInt(match[1])
    const labels = { s: 'second', m: 'minute', h: 'hour', d: 'day' }
    return `${n} ${labels[match[2]]}${n !== 1 ? 's' : ''}`
}

function getAccessibleChannels(guild, role) {
    const channels = []
    for (const [, channel] of guild.channels.cache) {
        if (channel.type !== 0 && channel.type !== 2) continue // text + voice only
        const overwrite = channel.permissionOverwrites.cache.get(role.id)
        if (overwrite && overwrite.allow.has('ViewChannel')) {
            channels.push(channel)
        }
    }
    return channels
}

function getRolePermissionsSummary(role) {
    const perms = []
    const p = role.permissions
    if (p.has('SendMessages')) perms.push('Send Messages')
    if (p.has('ReadMessageHistory')) perms.push('Read History')
    if (p.has('AttachFiles')) perms.push('Attach Files')
    if (p.has('EmbedLinks')) perms.push('Embed Links')
    if (p.has('UseExternalEmojis')) perms.push('External Emojis')
    if (p.has('Connect')) perms.push('Connect to Voice')
    if (p.has('Speak')) perms.push('Speak in Voice')
    if (p.has('MentionEveryone')) perms.push('Mention Everyone')
    if (p.has('ManageMessages')) perms.push('Manage Messages')
    if (p.has('Administrator')) perms.push('Administrator')
    return perms
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleadd')
        .setDescription('Add a role to a user with optional timer and DM')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Target user').setRequired(true)
        )
        .addRoleOption(opt =>
            opt.setName('role').setDescription('Role to add').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('time')
                .setDescription('Duration: 10m, 2h, 1d (empty = permanent)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('dm')
                .setDescription('Send DM to user?')
                .setRequired(false)
                .addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' })
        )
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('Custom DM message (if dm = Yes)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })

        const targetUser = interaction.options.getUser('user')
        const role = interaction.options.getRole('role')
        const timeStr = interaction.options.getString('time')
        const dm = interaction.options.getString('dm')
        const customMsg = interaction.options.getString('message')

        // Always fetch — getMember() returns null if not cached
        let member
        try {
            member = await interaction.guild.members.fetch(targetUser.id)
        } catch {
            return interaction.editReply('User not found in this server.')
        }

        if (role.managed) return interaction.editReply('That role is managed by an integration and cannot be assigned manually.')

        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position)
            return interaction.editReply(`Role ${role} is above the bot in the hierarchy. Move the bot role higher in Server Settings → Roles.`)

        let ms = null
        if (timeStr) {
            ms = parseTime(timeStr)
            if (!ms) return interaction.editReply('Invalid time format. Use: 10s, 5m, 2h, 1d')
        }

        try { await member.roles.add(role) }
        catch { return interaction.editReply(`Failed to add ${role}. Check my permissions.`) }

        log('role_add', {
            executorId: interaction.user.id,
            executorUsername: interaction.user.username,
            targetId: member.id,
            targetUsername: member.user.username,
            roleId: role.id,
            roleName: role.name,
            extra: ms ? `duration: ${timeStr}` : 'permanent'
        })

        const expiresAt = ms ? Math.floor((Date.now() + ms) / 1000) : null

        if (ms) {
            const key = `${member.id}-${role.id}`
            if (timers.has(key)) clearTimeout(timers.get(key))
            timers.set(key, setTimeout(async () => {
                try { await member.roles.remove(role) } catch {}
                timers.delete(key)
            }, ms))
        }

        // Get what this role unlocks
        const accessChannels = getAccessibleChannels(interaction.guild, role)
        const perms = getRolePermissionsSummary(role)

        const channelList = accessChannels.length > 0
            ? accessChannels.slice(0, 10).map(c => `<#${c.id}>`).join('\n') + (accessChannels.length > 10 ? `\n+${accessChannels.length - 10} more` : '')
            : 'No specific channel overrides'

        const permList = perms.length > 0 ? perms.join(', ') : 'No special permissions'

        const g = interaction.guild
        // Staff confirmation embed
        const staffEmbed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`${e(g,'staffteam')} Role Added`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: `${e(g,'userslogo')} User`, value: `${member} \`${member.user.username}\``, inline: true },
                { name: `${e(g,'admin')} Role`, value: `${role}`, inline: true },
                { name: `${e(g,'boost')} Duration`, value: ms ? formatDuration(timeStr) : 'Permanent', inline: true },
                { name: `${e(g,'info')} Expires`, value: expiresAt ? `<t:${expiresAt}:R>` : 'Never', inline: true },
                { name: `${e(g,'star')} Channel Access`, value: channelList, inline: false },
                { name: `${e(g,'coin')} Permissions`, value: permList, inline: false }
            )
            .setFooter({ text: 'Senza Vault' })
            .setTimestamp()

        await interaction.editReply({ embeds: [staffEmbed] })

        // DM to user
        if (dm === 'yes') {
            const userEmbed = new EmbedBuilder()
                .setColor(0x7c3aed)
                .setTitle('Role Assigned — Senza Vault')
                .setDescription(
                    customMsg
                        ? customMsg
                        : `The role **${role.name}** has been added to your account.`
                )
                .addFields(
                    { name: 'Role', value: role.name, inline: true },
                    { name: 'Duration', value: ms ? formatDuration(timeStr) : 'Permanent', inline: true },
                    { name: 'Expires', value: expiresAt ? `<t:${expiresAt}:R> (<t:${expiresAt}:f>)` : 'Never', inline: true },
                    { name: 'Access', value: channelList, inline: false }
                )
                .setFooter({ text: 'Senza Vault • #1 Software Provider' })
                .setTimestamp()

            try { await member.user.send({ embeds: [userEmbed] }) }
            catch {}
        }
    }
}
