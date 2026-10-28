const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require("discord.js")
const { e, ge } = require("../utils/emojis")
const { log } = require("../utils/logger")
const fs = require("fs")
const path = require("path")

const configPath = path.join(__dirname, "..", "..", "data", "config.json")
const ticketsPath = path.join(__dirname, "..", "..", "data", "tickets.json")
const COOLDOWN_MS = 30 * 60 * 1000
const ticketCooldowns = new Map()

function getConfig() {
    try { return JSON.parse(fs.readFileSync(configPath, "utf8")) } catch { return { autoRoleId: null, ticketCounter: 0 } }
}
function saveConfig(d) { fs.writeFileSync(configPath, JSON.stringify(d, null, 2), "utf8") }
function getTickets() {
    try { return JSON.parse(fs.readFileSync(ticketsPath, "utf8")) } catch { return {} }
}
function saveTickets(d) { fs.writeFileSync(ticketsPath, JSON.stringify(d, null, 2), "utf8") }

function isStaff(interaction) {
    const OWNER_ID = process.env.OWNER_ID || "1539317326489329735"
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID
    if (interaction.user.id === OWNER_ID) return true
    if (STAFF_ROLE_ID && interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)) return true
    return false
}

function escapeHtml(str) {
    if (!str) return ""
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function formatMarkdown(str) {
    if (!str) return ""
    return escapeHtml(str)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        .replace(/\n/g, "<br>")
}

function generateHtmlTranscript(messages, ticketData, guildName) {
    const sorted = [...messages.values()].reverse()
    const rows = sorted.map(m => {
        const av = m.author.displayAvatarURL({ format: "png", size: 32 })
        const time = new Date(m.createdTimestamp).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        const isBot = m.author.bot
        const nameClass = isBot ? 'name bot' : 'name'
        const botTag = isBot ? '<span class="bt">BOT</span>' : ""

        let body = ""
        if (m.content) body += `<div class="cnt">${formatMarkdown(m.content)}</div>`
        if (m.attachments.size) m.attachments.forEach(a => {
            body += `<div class="att">📎 <a href="${a.url}" target="_blank">${escapeHtml(a.name)}</a></div>`
        })
        if (m.embeds.length) m.embeds.forEach(em => {
            if (em.description || em.title) {
                body += `<div class="embed" style="border-left-color:${em.hexColor || '#5865f2'}">`
                if (em.title) body += `<div class="em-title">${escapeHtml(em.title)}</div>`
                if (em.description) body += `<div class="em-desc">${formatMarkdown(em.description)}</div>`
                body += `</div>`
            }
        })
        if (!body) body = '<div class="cnt empty">[no text content]</div>'

        return `<div class="msg"><img src="${av}" class="av" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><circle cx=%2220%22 cy=%2220%22 r=%2220%22 fill=%22%235865f2%22/></svg>'"><div class="body"><span class="${nameClass}">${escapeHtml(m.author.username)}</span>${botTag}<span class="ts">${time}</span>${body}</div></div>`
    }).join("")

    const claimedLine = ticketData.claimedBy
        ? `<span class="badge claimed">Claimed by ${ticketData.claimedBy}</span>`
        : `<span class="badge unclaimed">Unclaimed</span>`
    const priority = ticketData.priority
        ? `<span class="badge p-${ticketData.priority}">${ticketData.priority.toUpperCase()}</span>`
        : ""

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Ticket #${ticketData.number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#313338;color:#dcddde;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px}
.header{background:#2b2d31;padding:20px 28px;border-bottom:2px solid #1e1f22;display:flex;justify-content:space-between;align-items:flex-start}
.header-left h1{font-size:22px;color:#fff;font-weight:700}
.header-left .sub{color:#949ba4;font-size:13px;margin-top:6px}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.badge{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.claimed{background:#3a7d44;color:#a3e9b5}
.unclaimed{background:#5c3a1e;color:#f6a854}
.p-low{background:#1a3a5c;color:#5daaef}
.p-medium{background:#5c4a00;color:#f6c844}
.p-high{background:#5c1a1a;color:#ef5d5d}
.stats{text-align:right;font-size:13px;color:#949ba4}
.stats span{display:block;margin-bottom:4px}
.messages{padding:16px 28px;max-width:900px;margin:0 auto}
.msg{display:flex;gap:14px;padding:6px 8px;border-radius:6px;margin-bottom:2px;transition:background .1s}
.msg:hover{background:#2e3035}
.av{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-top:2px}
.body{flex:1;min-width:0}
.name{font-weight:700;color:#fff;font-size:15px}
.name.bot{color:#5865f2}
.bt{background:#5865f2;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;margin-left:5px;vertical-align:middle;letter-spacing:.5px}
.ts{color:#87909c;font-size:11px;margin-left:8px;font-weight:400}
.cnt{color:#dcddde;margin-top:3px;line-height:1.5;word-break:break-word}
.cnt.empty{color:#595c63;font-style:italic}
.att{margin-top:4px;color:#00b0f4;font-size:13px}
.att a{color:#00b0f4;text-decoration:none}
.att a:hover{text-decoration:underline}
.embed{background:#2b2d31;border-left:4px solid #5865f2;padding:10px 14px;border-radius:0 4px 4px 0;margin-top:6px;max-width:500px}
.em-title{font-weight:700;color:#fff;font-size:14px;margin-bottom:4px}
.em-desc{color:#dcddde;font-size:13px;line-height:1.4}
code{background:#1e1f22;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:13px;color:#f0a500}
strong{color:#fff;font-weight:700}
del{text-decoration:line-through;color:#87909c}
.footer{text-align:center;padding:28px;color:#595c63;font-size:12px;border-top:1px solid #1e1f22;margin-top:20px}
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1>🎫 Ticket #${ticketData.number} — ${escapeHtml(ticketData.typeLabel)}</h1>
    <div class="sub">
      <strong>Server:</strong> ${escapeHtml(guildName)} &nbsp;•&nbsp;
      <strong>Opened by:</strong> ${escapeHtml(ticketData.username)} (${ticketData.userId}) &nbsp;•&nbsp;
      <strong>Opened:</strong> ${new Date(ticketData.openedAt).toLocaleString("en-US")}
    </div>
    <div class="badges">${claimedLine}${priority}</div>
  </div>
  <div class="stats">
    <span><strong>${sorted.length}</strong> messages</span>
    <span>Generated ${new Date().toLocaleString("en-US")}</span>
  </div>
</div>
<div class="messages">${rows || '<div class="cnt empty" style="padding:20px">(no messages)</div>'}</div>
<div class="footer">Senza Vault &nbsp;•&nbsp; Ticket #${ticketData.number} Transcript</div>
</body></html>`
}

function buildActionRow(claimed, claimedBy, guild) {
    const gef = (name, fallback) => ge(guild, name, fallback)
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel(claimed ? `Claimed — ${claimedBy}` : "Claim")
            .setStyle(claimed ? ButtonStyle.Success : ButtonStyle.Primary)
            .setEmoji(gef('verified', '✅'))
            .setDisabled(!!claimed),
        new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete")
            .setEmoji(gef('mop', '🗑️'))
            .setStyle(ButtonStyle.Secondary)
    )
}

const TICKET_TYPES = {
    ticket_purchase: {
        label: "Purchase a Product",
        desc: "Buy one of our software products",
        channelPrefix: "purchase",
        color: 0x7c3aed,
        emojiKey: "coin",
        intro: (em, user, num) => ({
            title: `${em("coin")} Purchase Ticket #${num}`,
            description:
                `Welcome ${user}.\n` +
                `${em("staffteam")} Staff will assist you shortly.\n\n` +
                `**Please provide:**\n` +
                `${em("coin")} Product you want to purchase\n` +
                `${em("paypal")} Payment method — PayPal / Crypto / Stripe / Paysafecard\n` +
                `${em("info")} Any additional questions`
        })
    },
    ticket_support: {
        label: "Get Support",
        desc: "Need help with our software or your order",
        channelPrefix: "support",
        color: 0x3aeded,
        emojiKey: "support",
        intro: (em, user, num) => ({
            title: `${em("support")} Support Ticket #${num}`,
            description:
                `Welcome ${user}.\n` +
                `${em("staffteam")} Our team will help you shortly.\n\n` +
                `**To help you faster, describe:**\n` +
                `${em("info")} Your issue in detail\n` +
                `${em("senzalogo")} Which product is affected\n` +
                `${em("bugsu")} Any error messages or screenshots`
        })
    },
    ticket_bug: {
        label: "Report a Bug",
        desc: "Found a bug or unexpected behavior",
        channelPrefix: "bug",
        color: 0xed7c3a,
        emojiKey: "bugsu",
        intro: (em, user, num) => ({
            title: `${em("bugsu")} Bug Report #${num}`,
            description:
                `Welcome ${user}.\n` +
                `${em("staffteam")} Thanks for reporting — our devs will review this.\n\n` +
                `**Include the following:**\n` +
                `${em("bugsu")} Describe the bug in detail\n` +
                `${em("info")} Steps to reproduce it\n` +
                `${em("senzalogo")} Which product / version\n` +
                `${em("coin")} Expected vs actual behavior`
        })
    },
    ticket_staff: {
        label: "Staff Application",
        desc: "Apply to join the Senza Vault team",
        channelPrefix: "staff-app",
        color: 0x3aed7c,
        emojiKey: "staffteam",
        intro: (em, user, num) => ({
            title: `${em("staffteam")} Staff Application #${num}`,
            description:
                `Welcome ${user}.\n` +
                `${em("admin")} Your application will be reviewed carefully.\n\n` +
                `**Answer the following:**\n` +
                `${em("info")} Age & timezone\n` +
                `${em("star")} Previous staff experience\n` +
                `${em("staffteam")} Why do you want to join Senza Vault?\n` +
                `${em("coin")} How many hours/week can you dedicate?\n` +
                `${em("userslogo")} Your Discord activity & skills`
        })
    },
    ticket_partner: {
        label: "Partnership",
        desc: "Partner or collaborate with Senza Vault",
        channelPrefix: "partner",
        color: 0xedcc3a,
        emojiKey: "star",
        intro: (em, user, num) => ({
            title: `${em("star")} Partnership #${num}`,
            description:
                `Welcome ${user}.\n` +
                `${em("senzalogo")} Thanks for your interest in partnering with us.\n\n` +
                `**Provide:**\n` +
                `${em("info")} Your server / project name & link\n` +
                `${em("userslogo")} Member count & activity level\n` +
                `${em("star")} What you offer & what you expect\n` +
                `${em("coin")} Any previous partnerships`
        })
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Send the Senza Vault ticket panel with dropdown")
        .addChannelOption(opt =>
            opt.setName("channel").setDescription("Channel to post in (default: current)").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel("channel") ?? interaction.channel
        const g = interaction.guild
        const em = (name) => e(g, name)

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({
                name: "SENZA VAULT — Support Center",
                iconURL: g.iconURL({ dynamic: true }) ?? undefined
            })
            .setTitle(`${em("senzalogo")} Senza Vault — Ticket System`)
            .setDescription(
                `${em("info")} **How it works:**\n` +
                `Pick a category from the dropdown below and a private ticket channel will open. ` +
                `Staff will reply directly inside your ticket.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**${em("star")} Available categories**\n\n` +
                `${em("coin")} **Purchase a Product** — Buy our software\n` +
                `${em("support")} **Get Support** — Help with orders or products\n` +
                `${em("bugsu")} **Report a Bug** — Unexpected behavior\n` +
                `${em("staffteam")} **Staff Application** — Join our team\n` +
                `${em("star")} **Partnership** — Collaborate with us\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `${em("boost")} Use the dropdown below to open the right ticket without leaving the panel.`
            )
            .setImage(process.env.PANEL_BANNER_URL ?? null)
            .setFooter({ text: "Senza Vault  •  #1 Software Provider  •  Select a category below" })
            .setTimestamp()

        const ge = (name, fallback) => {
            const found = g.emojis.cache.find(em => em.name === name)
                ?? interaction.client.emojis.cache.find(em => em.name === name)
            return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Select a ticket type...")
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel("Purchase a Product").setDescription("Buy one of our software products").setValue("ticket_purchase").setEmoji(ge("coin", "🛒")),
                new StringSelectMenuOptionBuilder().setLabel("Get Support").setDescription("Need help with our software or your order").setValue("ticket_support").setEmoji(ge("support", "🎫")),
                new StringSelectMenuOptionBuilder().setLabel("Report a Bug").setDescription("Found a bug or unexpected behavior").setValue("ticket_bug").setEmoji(ge("bugsu", "🐛")),
                new StringSelectMenuOptionBuilder().setLabel("Staff Application").setDescription("Apply to join the Senza Vault team").setValue("ticket_staff").setEmoji(ge("staffteam", "👥")),
                new StringSelectMenuOptionBuilder().setLabel("Partnership").setDescription("Partner or collaborate with Senza Vault").setValue("ticket_partner").setEmoji(ge("star", "⭐"))
            )

        const row = new ActionRowBuilder().addComponents(menu)
        await channel.send({ embeds: [embed], components: [row] })
        await interaction.reply({ content: `${em("senzalogo")} Ticket panel sent to ${channel}`, ephemeral: true })
    },

    async handleSelect(interaction) {
        if (interaction.customId !== "ticket_select") return

        await interaction.deferReply({ ephemeral: true })

        const type = interaction.values[0]
        const ticketType = TICKET_TYPES[type]
        if (!ticketType) return interaction.editReply("Unknown ticket type.")

        const guild = interaction.guild
        const user = interaction.user
        const OWNER_ID = process.env.OWNER_ID || "1539317326489329735"
        const botId = guild.members.me.id
        const em = (name) => e(guild, name)

        // Cooldown check (skip for staff)
        const staffRoleId = process.env.STAFF_ROLE_ID
        const isMemberStaff = user.id === OWNER_ID || (staffRoleId && interaction.member?.roles?.cache?.has(staffRoleId))
        if (!isMemberStaff) {
            const lastTime = ticketCooldowns.get(user.id)
            if (lastTime && Date.now() - lastTime < COOLDOWN_MS) {
                const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastTime)) / 60000)
                return interaction.editReply(`${em("info")} Cooldown active. Wait **${remaining} minute(s)** before opening another ticket.`)
            }
        }

        // Check existing ticket
        const existing = guild.channels.cache.find(c => c.topic && c.topic.includes(`user:${user.id}`))
        if (existing) return interaction.editReply(`${em("info")} You already have an open ticket: ${existing}`)

        const config = getConfig()
        const nextNum = (config.ticketCounter || 0) + 1
        // Save counter immediately — prevents race condition duplicates on concurrent opens
        config.ticketCounter = nextNum
        saveConfig(config)

        const ticketNum = String(nextNum).padStart(4, "0")
        const channelName = `${ticketType.channelPrefix}-${ticketNum}`

        const permissionOverwrites = [
            { id: guild.id, type: 0, deny: ["ViewChannel"] },
            { id: user.id, type: 1, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "AttachFiles"] },
            { id: OWNER_ID, type: 1, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageMessages", "AttachFiles"] },
            { id: botId, type: 1, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageMessages", "ManageChannels", "AttachFiles"] }
        ]

        if (staffRoleId) {
            permissionOverwrites.push({ id: staffRoleId, type: 0, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageMessages", "AttachFiles"] })
        }

        let channel
        try {
            channel = await guild.channels.create({
                name: channelName,
                type: 0,
                parent: process.env.TICKET_CATEGORY_ID || null,
                topic: `${ticketType.label} | user:${user.id} | opened:<t:${Math.floor(Date.now() / 1000)}:f>`,
                permissionOverwrites
            })
            config.ticketCounter = nextNum
            saveConfig(config)

            const tickets = getTickets()
            tickets[channel.id] = {
                number: ticketNum,
                type,
                typeLabel: ticketType.label,
                userId: user.id,
                username: user.username,
                openedAt: Date.now(),
                claimedBy: null,
                claimedAt: null,
                priority: "medium"
            }
            saveTickets(tickets)
            ticketCooldowns.set(user.id, Date.now())
        } catch (err) {
            console.error("[TicketSetup Error]", err)
            return interaction.editReply(
                "Could not create ticket channel.\n" +
                "**Fix:** Move the bot role above all others in Server Settings → Roles. Ensure **Manage Channels** is granted."
            )
        }

        const openedTs = Math.floor(Date.now() / 1000)
        const introData = ticketType.intro(em, user, ticketNum)

        const ticketEmbed = new EmbedBuilder()
            .setColor(ticketType.color)
            .setAuthor({
                name: `SENZA VAULT — ${ticketType.label}`,
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(introData.title)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(introData.description)
            .addFields(
                { name: `${em("userslogo")} User`, value: `${user}\n\`${user.id}\``, inline: true },
                { name: `${em("info")} Category`, value: `\`${ticketType.label}\``, inline: true },
                { name: `${em("boost")} Opened`, value: `<t:${openedTs}:R>`, inline: true }
            )
            .setFooter({ text: "Senza Vault  •  Claim or Close below" })
            .setTimestamp()

        const pings = [`<@${OWNER_ID}>`]
        if (staffRoleId) pings.push(`<@&${staffRoleId}>`)

        await channel.send({
            content: `${pings.join(" ")} — new **${ticketType.label}** from ${user}`,
            embeds: [ticketEmbed],
            components: [buildActionRow(false, null, guild)]
        })

        log("ticket_open", {
            executorId: user.id,
            executorUsername: user.username,
            targetId: user.id,
            targetUsername: user.username,
            extra: `[${ticketType.label}] ticket #${ticketNum} channel:${channel.id}`
        })

        return interaction.editReply(`${em("boost")} Ticket opened: ${channel} — **${ticketType.label} #${ticketNum}**`)
    },

    async handleButton(interaction) {
        const { customId } = interaction
        if (!["claim_ticket", "close_ticket", "delete_ticket"].includes(customId)) return

        const guild = interaction.guild
        const user = interaction.user
        const channel = interaction.channel
        const em = (name) => e(guild, name)
        const OWNER_ID = process.env.OWNER_ID || "1539317326489329735"
        const tickets = getTickets()
        const ticketData = tickets[channel.id]

        if (!ticketData) return interaction.reply({ content: "No ticket data found for this channel.", ephemeral: true })

        // ----- CLAIM -----
        if (customId === "claim_ticket") {
            if (!isStaff(interaction)) {
                return interaction.reply({ content: `${em("info")} Only staff can claim tickets.`, ephemeral: true })
            }
            await interaction.deferUpdate()

            if (ticketData.claimedBy) {
                return interaction.followUp({ content: `${em("info")} Already claimed by <@${ticketData.claimedBy}>.`, ephemeral: true })
            }

            ticketData.claimedBy = user.id
            ticketData.claimedAt = Date.now()
            tickets[channel.id] = ticketData
            saveTickets(tickets)

            await channel.setTopic((channel.topic || "") + ` | claimed:${user.id}`).catch(() => {})
            await interaction.message.edit({ components: [buildActionRow(true, user.username, interaction.guild)] }).catch(() => {})

            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x3aed7c)
                    .setDescription(`${em("staffteam")} ${user} has **claimed** this ticket.`)
                    .setTimestamp()]
            })

            log("ticket_claim", {
                executorId: user.id,
                executorUsername: user.username,
                targetId: ticketData.userId,
                targetUsername: ticketData.username,
                extra: `ticket #${ticketData.number} channel:${channel.id}`
            })
        }

        // ----- CLOSE -----
        if (customId === "close_ticket") {
            const isOpener = user.id === ticketData.userId
            if (!isStaff(interaction) && !isOpener) {
                return interaction.reply({ content: `${em("info")} Only staff or the ticket opener can close this ticket.`, ephemeral: true })
            }
            await interaction.deferUpdate()

            // Lock channel for everyone
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }).catch(() => {})
            await channel.permissionOverwrites.edit(ticketData.userId, { SendMessages: false }).catch(() => {})

            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xed3a3a)
                    .setDescription(`${em("mop") || "🔒"} Ticket closed by ${user}. Generating transcript...`)
                    .setTimestamp()]
            }).catch(() => {})

            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Map())
            const htmlContent = generateHtmlTranscript(messages, ticketData, guild.name)

            const LOG_CHANNEL_ID = process.env.TICKET_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID
            if (LOG_CHANNEL_ID) {
                const logCh = guild.channels.cache.get(LOG_CHANNEL_ID)
                if (logCh) {
                    const closeEmbed = new EmbedBuilder()
                        .setColor(0xed3a3a)
                        .setTitle(`${em("mop") || '🗑️'} Ticket Closed — #${ticketData.number}`)
                        .setDescription(
                            `**Type:** \`${ticketData.typeLabel}\`\n` +
                            `${em("userslogo")} **Opened by:** <@${ticketData.userId}> (\`${ticketData.username}\`)\n` +
                            `${em("staffteam")} **Claimed by:** ${ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : "Unclaimed"}\n` +
                            `${em("mop") || "🔒"} **Closed by:** ${user}\n` +
                            `**Priority:** \`${ticketData.priority || "medium"}\`\n` +
                            `${em("coin")} **Opened:** <t:${Math.floor(ticketData.openedAt / 1000)}:R>`
                        )
                        .setTimestamp()

                    const buf = Buffer.from(htmlContent, "utf8")
                    await logCh.send({
                        embeds: [closeEmbed],
                        files: [{ attachment: buf, name: `ticket-${ticketData.number}.html` }]
                    }).catch(() => {})
                }
            }

            // Rating DM
            const opener = await guild.members.fetch(ticketData.userId).catch(() => null)
            if (opener) {
                const rateRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`ticket_rate_1_${ticketData.number}`).setLabel("⭐ 1").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_2_${ticketData.number}`).setLabel("⭐ 2").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_3_${ticketData.number}`).setLabel("⭐ 3").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_4_${ticketData.number}`).setLabel("⭐ 4").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_5_${ticketData.number}`).setLabel("⭐ 5").setStyle(ButtonStyle.Primary)
                )
                const rateEmbed = new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setTitle(`${em("verified") || '⭐'} How was your support experience?`)
                    .setDescription(`Your ticket **#${ticketData.number}** (${ticketData.typeLabel}) has been closed.\nRate the support you received:`)
                    .setFooter({ text: "Senza Vault" })
                opener.send({ embeds: [rateEmbed], components: [rateRow] }).catch(() => {})
            }

            log("ticket_close", {
                executorId: user.id,
                executorUsername: user.username,
                targetId: ticketData.userId,
                targetUsername: ticketData.username,
                extra: `ticket #${ticketData.number} channel:${channel.id}`
            })

            delete tickets[channel.id]
            saveTickets(tickets)

            setTimeout(() => channel.delete().catch(() => {}), 7000)
        }

        // ----- DELETE (no transcript) -----
        if (customId === "delete_ticket") {
            if (user.id !== OWNER_ID) {
                return interaction.reply({ content: `${em("info")} Only the owner can silently delete tickets.`, ephemeral: true })
            }
            await interaction.deferUpdate()

            log("ticket_delete", {
                executorId: user.id,
                executorUsername: user.username,
                targetId: ticketData.userId,
                targetUsername: ticketData.username,
                extra: `ticket #${ticketData.number} channel:${channel.id} (no transcript)`
            })

            delete tickets[channel.id]
            saveTickets(tickets)

            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x87909c)
                    .setDescription(`${em("mop") || "🗑️"} Ticket deleted by ${user}. Channel removing in 3s...`)
                    .setTimestamp()]
            }).catch(() => {})

            setTimeout(() => channel.delete().catch(() => {}), 3000)
        }
    },

    async handleRating(interaction) {
        if (!interaction.customId.startsWith("ticket_rate_")) return
        const parts = interaction.customId.split("_")
        const stars = parseInt(parts[2])
        const ticketNum = parts[3]

        const rGuild = interaction.guild || interaction.client.guilds.cache.get(process.env.ALLOWED_GUILD_ID || "1554899954487795832")
        const em = (name) => e(rGuild, name)
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(0x3aed7c)
                .setTitle(`${em("verified") || '✅'} Thank you for your feedback!`)
                .setDescription(`You rated ticket **#${ticketNum}** with **${"⭐".repeat(stars)}** (${stars}/5).\nWe appreciate your response!`)
                .setFooter({ text: "Senza Vault" })],
            components: []
        }).catch(() => {})

        const LOG_CHANNEL_ID = process.env.TICKET_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID
        if (LOG_CHANNEL_ID) {
            const guild = interaction.client.guilds.cache.find(g => g.members.cache.has(interaction.user.id))
            const logCh = guild?.channels.cache.get(LOG_CHANNEL_ID)
            if (logCh) {
                await logCh.send({
                    embeds: [new EmbedBuilder()
                        .setColor(stars >= 4 ? 0x3aed7c : stars >= 3 ? 0xedcc3a : 0xed3a3a)
                        .setTitle(`${em("verified") || '⭐'} Rating — Ticket #${ticketNum}`)
                        .setDescription(`${interaction.user} rated their ticket **${"⭐".repeat(stars)} ${stars}/5**`)
                        .setTimestamp()]
                }).catch(() => {})
            }
        }
    }
}
