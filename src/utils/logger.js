const fs = require('fs')
const path = require('path')
const { EmbedBuilder } = require('discord.js')

const LOGS_PATH = path.join(__dirname, '..', '..', 'data', 'logs.json')
const MAX_LOGS = 500

let _client = null
function setClient(client) { _client = client }

function readLogs() {
    try { return JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8')) }
    catch { return [] }
}

function writeLogs(logs) {
    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8')
}

const TYPE_LABELS = {
    role_add: 'Role Added',
    role_remove: 'Role Removed',
    role_add_all: 'Role Added (All)',
    role_remove_all: 'Role Removed (All)',
    auto_role: 'Auto Role Set',
    ticket_open: 'Ticket Opened',
    ticket_close: 'Ticket Closed',
    ticket_claim: 'Ticket Claimed',
    ticket_delete: 'Ticket Deleted',
    ticket_add_user: 'Ticket User Added',
    ticket_remove_user: 'Ticket User Removed',
    ticket_priority: 'Ticket Priority Changed',
    ticket_rename: 'Ticket Renamed',
    member_join: 'Member Joined',
    member_leave: 'Member Left',
    member_ban: 'Member Banned',
    member_unban: 'Member Unbanned',
    message_delete: 'Message Deleted',
    message_edit: 'Message Edited',
    nickname_change: 'Nickname Changed'
}

const TYPE_ICONS = {
    role_add: '+',
    role_remove: '−',
    role_add_all: '++',
    role_remove_all: '−−',
    auto_role: '⚙',
    ticket_open: '▶',
    ticket_close: '■',
    ticket_claim: '◆',
    ticket_delete: '✕',
    ticket_add_user: '+',
    ticket_remove_user: '−',
    ticket_priority: '▲',
    ticket_rename: '✎',
    member_join: '→',
    member_leave: '←',
    member_ban: 'X',
    member_unban: 'O',
    message_delete: 'D',
    message_edit: 'E',
    nickname_change: '~'
}

const TYPE_COLORS = {
    member_join: 0x3ba55c,
    member_leave: 0x6b6b8a,
    member_ban: 0xed3a3a,
    member_unban: 0x3aed7c,
    message_delete: 0xed7c3a,
    message_edit: 0xedcc3a,
    nickname_change: 0x7c3aed,
    role_add: 0x3aeded,
    role_remove: 0xed3a7c,
    role_add_all: 0x3aeded,
    role_remove_all: 0xed3a7c,
    auto_role: 0x7c3aed,
    ticket_open: 0x7c3aed,
    ticket_close: 0x5b21b6,
    ticket_claim: 0x5b21b6,
    ticket_delete: 0xed3a3a,
    ticket_add_user: 0x3aed7c,
    ticket_remove_user: 0xed7c3a,
    ticket_priority: 0xedcc3a,
    ticket_rename: 0x7c3aed
}

function log(type, data) {
    const logs = readLogs()
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        timestamp: Date.now(),
        executorId: data.executorId || null,
        executorUsername: data.executorUsername || null,
        targetId: data.targetId || null,
        targetUsername: data.targetUsername || null,
        roleId: data.roleId || null,
        roleName: data.roleName || null,
        extra: data.extra || null
    }
    logs.unshift(entry)
    if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS)
    writeLogs(logs)

    // Post to log channel
    const logChannelId = process.env.LOG_CHANNEL_ID
    if (_client && logChannelId) {
        const channel = _client.channels.cache.get(logChannelId)
        if (channel) {
            const label = TYPE_LABELS[type] || type
            const icon = TYPE_ICONS[type] || '•'
            const color = TYPE_COLORS[type] || 0x7c3aed
            const ts = Math.floor(entry.timestamp / 1000)

            const desc = [
                entry.executorId ? `**By:** <@${entry.executorId}> \`${entry.executorUsername}\`` : null,
                entry.targetId ? `**Target:** <@${entry.targetId}> \`${entry.targetUsername}\`` : null,
                entry.roleName ? `**Role:** \`@${entry.roleName}\`` : null,
                entry.extra ? `**Detail:** ${entry.extra}` : null
            ].filter(Boolean).join('\n') || 'No details.'

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `${icon}  ${label}` })
                .setDescription(desc)
                .setFooter({ text: `ID: ${entry.id}` })
                .setTimestamp(entry.timestamp)

            channel.send({ embeds: [embed] }).catch(() => {})
        }
    }

    return entry
}

function getLogs({ type, targetId, executorId, limit = 10 } = {}) {
    let logs = readLogs()
    if (type) logs = logs.filter(l => l.type === type)
    if (targetId) logs = logs.filter(l => l.targetId === targetId || l.executorId === targetId)
    if (executorId) logs = logs.filter(l => l.executorId === executorId)
    return logs.slice(0, Math.min(limit, 25))
}

module.exports = { log, getLogs, setClient, TYPE_LABELS, TYPE_ICONS }
