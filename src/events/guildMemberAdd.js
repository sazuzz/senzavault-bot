const { EmbedBuilder, AttachmentBuilder } = require('discord.js')
const { log } = require('../utils/logger')
const { e } = require('../utils/emojis')
const fs = require('fs')
const path = require('path')

let createCanvas, loadImage
try {
    const cv = require('canvas')
    createCanvas = cv.createCanvas
    loadImage    = cv.loadImage
} catch {
    console.warn('[Welcome] canvas not available — banner disabled')
}

const configPath = path.join(__dirname, '..', '..', 'data', 'config.json')
function getConfig() {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    catch { return { autoRoleId: null } }
}

const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID

async function buildWelcomeBanner(member) {
    if (!createCanvas || !loadImage) return null
    const W = 1000, H = 300
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#0b0b13'
    ctx.fillRect(0, 0, W, H)

    // Radial glow behind avatar
    const glowL = ctx.createRadialGradient(148, 148, 20, 148, 148, 160)
    glowL.addColorStop(0, 'rgba(124,58,237,0.18)')
    glowL.addColorStop(1, 'rgba(124,58,237,0)')
    ctx.fillStyle = glowL
    ctx.fillRect(0, 0, W, H)

    // Right-side radial accent
    const glowR = ctx.createRadialGradient(W, 0, 0, W, 0, 420)
    glowR.addColorStop(0, 'rgba(91,33,182,0.14)')
    glowR.addColorStop(1, 'rgba(91,33,182,0)')
    ctx.fillStyle = glowR
    ctx.fillRect(0, 0, W, H)

    // Dot grid (right half only)
    ctx.fillStyle = 'rgba(124,58,237,0.06)'
    for (let x = 490; x < W; x += 22) {
        for (let y = 14; y < H - 50; y += 22) {
            ctx.beginPath()
            ctx.arc(x, y, 1.2, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    // Top gradient bar
    const topBar = ctx.createLinearGradient(0, 0, W, 0)
    topBar.addColorStop(0, '#7c3aed')
    topBar.addColorStop(0.45, '#9d5cf6')
    topBar.addColorStop(1, '#5b21b6')
    ctx.fillStyle = topBar
    ctx.fillRect(0, 0, W, 5)

    // Bottom footer fade
    const footerGrad = ctx.createLinearGradient(0, H - 52, 0, H)
    footerGrad.addColorStop(0, 'rgba(20,20,35,0)')
    footerGrad.addColorStop(1, '#111120')
    ctx.fillStyle = footerGrad
    ctx.fillRect(0, H - 52, W, 52)

    // Left accent line
    const lineGrad = ctx.createLinearGradient(0, 30, 0, H - 52)
    lineGrad.addColorStop(0, 'rgba(124,58,237,0.8)')
    lineGrad.addColorStop(1, 'rgba(124,58,237,0)')
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(52, 30)
    ctx.lineTo(52, H - 52)
    ctx.stroke()

    // Avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 })
    let avatar
    try { avatar = await loadImage(avatarURL) }
    catch { avatar = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png') }

    const ax = 148, ay = 138, ar = 88

    // Avatar glow ring
    ctx.shadowColor = 'rgba(124,58,237,0.55)'
    ctx.shadowBlur = 32
    ctx.beginPath()
    ctx.arc(ax, ay, ar + 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(124,58,237,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0

    // Avatar clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(ax, ay, ar, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatar, ax - ar, ay - ar, ar * 2, ar * 2)
    ctx.restore()

    // Avatar border gradient
    const borderGrad = ctx.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar)
    borderGrad.addColorStop(0, '#9d5cf6')
    borderGrad.addColorStop(1, '#5b21b6')
    ctx.beginPath()
    ctx.arc(ax, ay, ar + 3, 0, Math.PI * 2)
    ctx.strokeStyle = borderGrad
    ctx.lineWidth = 3.5
    ctx.stroke()

    // Online dot
    ctx.beginPath()
    ctx.arc(ax + ar - 4, ay + ar - 4, 15, 0, Math.PI * 2)
    ctx.fillStyle = '#0b0b13'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ax + ar - 4, ay + ar - 4, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#23a55a'
    ctx.fill()

    // Text area
    const tx = ax + ar + 42

    // "WELCOME TO" pill tag
    const tagText = 'W E L C O M E  T O'
    ctx.font = 'bold 11px sans-serif'
    const tagW = ctx.measureText(tagText).width + 20
    ctx.fillStyle = 'rgba(124,58,237,0.22)'
    ctx.beginPath()
    ctx.roundRect(tx, ay - 82, tagW, 22, 4)
    ctx.fill()
    ctx.fillStyle = '#9d5cf6'
    ctx.fillText(tagText, tx + 10, ay - 66)

    // Server name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText('SENZA VAULT', tx, ay - 36)

    // Gradient rule
    const ruleGrad = ctx.createLinearGradient(tx, 0, tx + 440, 0)
    ruleGrad.addColorStop(0, '#7c3aed')
    ruleGrad.addColorStop(0.6, 'rgba(124,58,237,0.3)')
    ruleGrad.addColorStop(1, 'rgba(124,58,237,0)')
    ctx.fillStyle = ruleGrad
    ctx.fillRect(tx, ay - 22, 440, 1.5)

    // Display name with gradient
    const name = member.user.displayName.length > 18
        ? member.user.displayName.slice(0, 18) + '…'
        : member.user.displayName
    const nameGrad = ctx.createLinearGradient(tx, 0, tx + 320, 0)
    nameGrad.addColorStop(0, '#ffffff')
    nameGrad.addColorStop(1, '#c4b5fd')
    ctx.fillStyle = nameGrad
    ctx.font = 'bold 46px sans-serif'
    ctx.fillText(name, tx, ay + 30)

    // Username
    ctx.fillStyle = '#6b6b9a'
    ctx.font = '20px sans-serif'
    ctx.fillText(`@${member.user.username}`, tx, ay + 58)

    // Member count badge
    const count = member.guild.memberCount
    const badgeText = `MEMBER  #${count.toLocaleString()}`
    ctx.font = 'bold 11px sans-serif'
    const badgeW = ctx.measureText(badgeText).width + 24
    ctx.fillStyle = 'rgba(124,58,237,0.22)'
    ctx.beginPath()
    ctx.roundRect(tx, ay + 72, badgeW, 24, 4)
    ctx.fill()
    ctx.fillStyle = '#a78bfa'
    ctx.fillText(badgeText, tx + 12, ay + 88)

    // Bottom bar date
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    ctx.fillStyle = '#555570'
    ctx.font = '12px sans-serif'
    ctx.fillText(dateStr, 68, H - 16)

    // Right WELCOME pill
    const bw = 120, bh = 30, bx = W - bw - 18, by = H - bh - 10
    const pillGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0)
    pillGrad.addColorStop(0, '#7c3aed')
    pillGrad.addColorStop(1, '#5b21b6')
    ctx.fillStyle = pillGrad
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px sans-serif'
    const lw = ctx.measureText('WELCOME').width
    ctx.fillText('WELCOME', bx + (bw - lw) / 2, by + 20)

    return canvas.toBuffer('image/png')
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        // Apply auto-role if set
        const { autoRoleId } = getConfig()
        if (autoRoleId) {
            const role = member.guild.roles.cache.get(autoRoleId)
            if (role) await member.roles.add(role).catch(() => {})
        }

        log('member_join', {
            targetId: member.user.id,
            targetUsername: member.user.username,
            extra: `account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        })

        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID)
        if (!channel) return

        const user = member.user
        const memberCount = member.guild.memberCount
        const ms = Date.now() - user.createdTimestamp
        const days = Math.floor(ms / 86400000)
        const years = Math.floor(days / 365)
        const months = Math.floor((days % 365) / 30)
        const timeAgo = years >= 1
            ? `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months > 1 ? 's' : ''}` : ''}`
            : months >= 1 ? `${months} month${months > 1 ? 's' : ''}`
            : `${days} day${days !== 1 ? 's' : ''}`

        const buffer = await buildWelcomeBanner(member).catch(() => null)

        const g = member.guild
        const em = (name) => e(g, name)

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`${em('senzalogo')} Welcome to Senza Vault`)
            .addFields(
                { name: `${em('userslogo')} Member`,      value: `${user}\n\`${user.username}\``,          inline: true },
                { name: `${em('star')} Member Count`,     value: `\`#${memberCount.toLocaleString()}\``,   inline: true },
                { name: `${em('info')} Account Age`,      value: timeAgo,                                   inline: true }
            )
            .setFooter({ text: 'Senza Vault  •  #1 Software Provider' })
            .setTimestamp()

        if (buffer) {
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' })
            embed.setImage('attachment://welcome.png')
            await channel.send({ content: `${user}`, embeds: [embed], files: [attachment] })
        } else {
            embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            await channel.send({ content: `${user}`, embeds: [embed] })
        }
    }
}
