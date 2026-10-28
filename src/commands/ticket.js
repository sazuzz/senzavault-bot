const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    PermissionFlagsBits
} = require("discord.js")
const { e } = require("../utils/emojis")
const { log } = require("../utils/logger")
const fs = require("fs")
const path = require("path")

const ticketsPath = path.join(__dirname, "..", "..", "data", "tickets.json")

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

const PRIORITY_COLORS = { low: 0x5daaef, medium: 0xedcc3a, high: 0xef5d5d }
const PRIORITY_LABELS = { low: "🔵 Low", medium: "🟡 Medium", high: "🔴 High" }

function escapeHtml(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function buildTranscriptHtml(messages, ticketData, guildName, closedBy, reason) {
    const rows = messages.map(m => {
        const ts = new Date(m.createdTimestamp).toLocaleString("en-US")
        const avatar = m.author.displayAvatarURL({ extension: "png", size: 64 })
        const content = escapeHtml(m.content)
        const embeds = m.embeds.map(em =>
            `<div class="embed"><b>${escapeHtml(em.title || "Embed")}</b>${em.description ? `<p>${escapeHtml(em.description)}</p>` : ""}</div>`
        ).join("")
        const attachments = [...m.attachments.values()].map(a =>
            `<a href="${a.url}" target="_blank" class="att">[📎 ${escapeHtml(a.name)}]</a>`
        ).join(" ")
        return `<div class="msg${m.author.bot ? " bot" : ""}">
            <img class="av" src="${avatar}" onerror="this.style.display='none'"/>
            <div class="bub">
                <span class="au">${escapeHtml(m.author.username)}${m.author.bot ? " <span class='bb'>BOT</span>" : ""}</span>
                <span class="ts">${ts}</span>
                ${content ? `<p>${content}</p>` : ""}${embeds}${attachments}
            </div></div>`
    }).join("")

    const t = ticketData
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Ticket #${t.number}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0e0e16;color:#d4d4e8;font-family:'Segoe UI',sans-serif;font-size:14px;padding:24px}
.hdr{background:#1a1a2a;border:1px solid #2e2e4a;border-radius:12px;padding:20px 24px;margin-bottom:24px}
.hdr h1{font-size:18px;color:#a78bfa;margin-bottom:12px}
.meta{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.mi{background:#0e0e16;border-radius:8px;padding:8px 12px}
.ml{font-size:11px;color:#6b6b8a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.mv{color:#e8e8f0;font-size:13px}
.msgs{display:flex;flex-direction:column;gap:4px}
.msg{display:flex;gap:12px;padding:8px 12px;border-radius:8px;align-items:flex-start}
.msg:hover{background:#1a1a2a}
.msg.bot{opacity:.8}
.av{width:36px;height:36px;border-radius:50%;flex-shrink:0}
.bub{flex:1}
.au{font-weight:600;color:#a78bfa;margin-right:8px}
.bb{background:#5865f2;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px}
.ts{font-size:11px;color:#4a4a6a}
.bub p{margin-top:4px;color:#c8c8e0;line-height:1.5;white-space:pre-wrap}
.embed{background:#1e1e30;border-left:3px solid #7c3aed;border-radius:0 6px 6px 0;padding:8px 12px;margin-top:6px}
.embed b{color:#c8c8e0;font-size:13px}
.embed p{color:#9090a8;font-size:12px;margin-top:4px}
.att{color:#7c9aed;text-decoration:none;font-size:12px}
.ftr{margin-top:24px;text-align:center;color:#4a4a6a;font-size:12px}
</style></head><body>
<div class="hdr"><h1>📋 Ticket #${t.number} — ${escapeHtml(guildName)}</h1>
<div class="meta">
<div class="mi"><div class="ml">Type</div><div class="mv">${escapeHtml(t.typeLabel || "Ticket")}</div></div>
<div class="mi"><div class="ml">Opened By</div><div class="mv">${escapeHtml(t.username)} (${t.userId})</div></div>
<div class="mi"><div class="ml">Opened At</div><div class="mv">${t.openedAt ? new Date(t.openedAt).toLocaleString("en-US") : "—"}</div></div>
<div class="mi"><div class="ml">Priority</div><div class="mv">${escapeHtml(t.priority || "medium")}</div></div>
<div class="mi"><div class="ml">Claimed By</div><div class="mv">${escapeHtml(t.claimedByUsername || t.claimedBy || "Nobody")}</div></div>
<div class="mi"><div class="ml">Closed By</div><div class="mv">${escapeHtml(closedBy.username)}</div></div>
${reason ? `<div class="mi"><div class="ml">Reason</div><div class="mv">${escapeHtml(reason)}</div></div>` : ""}
${t.product ? `<div class="mi"><div class="ml">Product</div><div class="mv">${escapeHtml(t.product)}</div></div>` : ""}
${t.paymentMethod ? `<div class="mi"><div class="ml">Payment</div><div class="mv">${escapeHtml(t.paymentMethod)}</div></div>` : ""}
<div class="mi"><div class="ml">Messages</div><div class="mv">${messages.length}</div></div>
</div></div>
<div class="msgs">${rows}</div>
<div class="ftr">Generated by Senza Vault Bot • ${new Date().toLocaleString("en-US")}</div>
</body></html>`
}

async function fetchAllMessages(channel) {
    const all = []
    let lastId = null
    while (true) {
        const opts = { limit: 100 }
        if (lastId) opts.before = lastId
        const batch = await channel.messages.fetch(opts)
        if (batch.size === 0) break
        all.push(...batch.values())
        lastId = batch.last().id
        if (batch.size < 100) break
    }
    all.reverse()
    return all
}

async function performClose(guild, channel, closedBy, ticketData, reason) {
    const closedTs = Math.floor(Date.now() / 1000)
    const em = (name) => e(guild, name)

    await channel.permissionOverwrites.edit(ticketData.userId, { SendMessages: false }).catch(() => {})

    let allMessages = []
    try { allMessages = await fetchAllMessages(channel) } catch {}

    const html = buildTranscriptHtml(allMessages, ticketData, guild.name, closedBy, reason)
    const attachment = new AttachmentBuilder(Buffer.from(html, "utf8"), { name: `transcript-${ticketData.number}.html` })

    const logChannelId = process.env.TICKET_LOG_CHANNEL_ID
    if (logChannelId) {
        const logCh = guild.channels.cache.get(logChannelId)
        if (logCh) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x5b21b6)
                .setAuthor({
                    name: `SENZA VAULT — Ticket Closed`,
                    iconURL: guild.iconURL({ dynamic: true }) ?? undefined
                })
                .setTitle(`${em('mop') || '🗑️'} Ticket Closed — #${ticketData.number}`)
                .setDescription(
                    `> ${em('userslogo') || '👤'} **Opened by:** <@${ticketData.userId}> (\`${ticketData.username}\`)\n` +
                    `> ${em('mop') || '🔒'} **Closed by:** ${closedBy}\n` +
                    `> ${em('staffteam') || '👥'} **Claimed by:** ${ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : "Nobody"}\n` +
                    (reason ? `\n> ${em('info') || '📝'} **Reason:** ${reason}` : '')
                )
                .addFields(
                    { name: `${em('info') || '🎫'} Ticket`, value: `\`#${ticketData.number}\``, inline: true },
                    { name: `${em('coin') || '📂'} Type`, value: `\`${ticketData.typeLabel || "Ticket"}\``, inline: true },
                    { name: `⚡ Priority`, value: PRIORITY_LABELS[ticketData.priority] || "🟡 Medium", inline: true },
                    { name: `${em('boost') || '💬'} Messages`, value: `\`${allMessages.length}\``, inline: true },
                    { name: `${em('loading') || '🕐'} Closed at`, value: `<t:${closedTs}:f>`, inline: true },
                    ...(ticketData.paymentMethod ? [{ name: `${em('paypal') || '💳'} Payment`, value: `\`${ticketData.paymentMethod}\``, inline: true }] : [])
                )
                .setTimestamp()
            await logCh.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {})
        }
    }

    try {
        const opener = await guild.members.fetch(ticketData.userId)
        const ratingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ticket_rate_1_${ticketData.number}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_2_${ticketData.number}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_3_${ticketData.number}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_4_${ticketData.number}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_5_${ticketData.number}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Primary)
        )
        const ratingEmbed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`${em('verified') || '⭐'} How was your experience?`)
            .setDescription(
                `Your ticket **#${ticketData.number}** in **${guild.name}** was closed.\n\n` +
                `> ${em('staffteam') || '👥'} Rate the support you received below.\n` +
                `> ${em('coin') || '🙏'} Your feedback helps us improve!`
            )
            .setFooter({ text: "Senza Vault  •  Tap a star to rate" })
            .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
        await opener.send({ embeds: [ratingEmbed], components: [ratingRow] }).catch(() => {})
    } catch {}

    log("ticket_close", {
        executorId: closedBy.id, executorUsername: closedBy.username,
        targetId: ticketData.userId, targetUsername: ticketData.username,
        extra: `ticket #${ticketData.number}${reason ? ` reason:"${reason}"` : ""} msgs:${allMessages.length}`
    })

    const tickets = getTickets()
    delete tickets[channel.id]
    saveTickets(tickets)
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Manage the current ticket channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a user to this ticket")
                .addUserOption(opt => opt.setName("user").setDescription("User to add").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a user from this ticket")
                .addUserOption(opt => opt.setName("user").setDescription("User to remove").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("close")
                .setDescription("Close this ticket with optional reason")
                .addStringOption(opt => opt.setName("reason").setDescription("Reason for closing").setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName("rename")
                .setDescription("Rename this ticket channel")
                .addStringOption(opt => opt.setName("name").setDescription("New channel name").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all open tickets")
        )
        .addSubcommand(sub =>
            sub.setName("info")
                .setDescription("Show info about this ticket")
        )
        .addSubcommand(sub =>
            sub.setName("priority")
                .setDescription("Set ticket priority level")
                .addStringOption(opt =>
                    opt.setName("level")
                        .setDescription("Priority level")
                        .setRequired(true)
                        .addChoices(
                            { name: "🔵 Low", value: "low" },
                            { name: "🟡 Medium", value: "medium" },
                            { name: "🔴 High", value: "high" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName("transcript")
                .setDescription("Generate and post this ticket's transcript (staff only)")
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand()
        const guild = interaction.guild
        const user = interaction.user
        const channel = interaction.channel
        const em = (name) => e(guild, name)

        if (sub === "list") {
            if (!isStaff(interaction)) {
                return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            }
            const tickets = getTickets()
            const entries = Object.entries(tickets)
            if (!entries.length) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(0x3aed7c).setDescription(`${em("senzalogo")} No open tickets.`)],
                    ephemeral: true
                })
            }
            const rows = entries.map(([chanId, t]) => {
                const ch = guild.channels.cache.get(chanId)
                const chanRef = ch ? `<#${chanId}>` : `~~\`${chanId}\`~~`
                const pLabel = PRIORITY_LABELS[t.priority] || "🟡 Medium"
                const claimed = t.claimedBy ? `<@${t.claimedBy}>` : "—"
                const typeLabel = t.typeLabel ? ` \`${t.typeLabel}\`` : ""
                return `${pLabel} — **#${t.number}** ${chanRef}${typeLabel}\n  › <@${t.userId}> • Claimed: ${claimed} • <t:${Math.floor(t.openedAt / 1000)}:R>`
            })
            const chunks = []
            for (let i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10))
            const embeds = chunks.map((chunk, i) =>
                new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setAuthor(i === 0 ? {
                        name: `SENZA VAULT — Open Tickets`,
                        iconURL: guild.iconURL({ dynamic: true }) ?? undefined
                    } : undefined)
                    .setTitle(i === 0 ? `${em("info")} Open Tickets (${entries.length})` : "​")
                    .setDescription(chunk.join("\n\n"))
                    .setTimestamp(i === chunks.length - 1 ? new Date() : undefined)
            )
            return interaction.reply({ embeds, ephemeral: true })
        }

        const tickets = getTickets()
        const ticketData = tickets[channel.id]

        if (!ticketData) {
            return interaction.reply({ content: `${em("info")} Must be used inside a ticket channel.`, ephemeral: true })
        }

        if (sub === "add") {
            if (!isStaff(interaction)) return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            const target = interaction.options.getMember("user")
            if (!target) return interaction.reply({ content: "User not found.", ephemeral: true })
            await channel.permissionOverwrites.create(target, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true
            })
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x3aed7c)
                    .setDescription(`${em('verified') || em('staffteam')} ${target} added to ticket by ${user}.`)]
            })
            log("ticket_add_user", {
                executorId: user.id, executorUsername: user.username,
                targetId: target.id, targetUsername: target.user.username,
                extra: `ticket #${ticketData.number}`
            })
        }

        if (sub === "remove") {
            if (!isStaff(interaction)) return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            const target = interaction.options.getMember("user")
            if (!target) return interaction.reply({ content: "User not found.", ephemeral: true })
            if (target.id === ticketData.userId) {
                return interaction.reply({ content: `${em("info")} Cannot remove the ticket opener.`, ephemeral: true })
            }
            await channel.permissionOverwrites.delete(target).catch(() => {})
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xed7c3a)
                    .setDescription(`${em("mop") || "🔕"} ${target} removed from ticket by ${user}.`)]
            })
            log("ticket_remove_user", {
                executorId: user.id, executorUsername: user.username,
                targetId: target.id, targetUsername: target.user.username,
                extra: `ticket #${ticketData.number}`
            })
        }

        if (sub === "close") {
            const isOpener = user.id === ticketData.userId
            if (!isStaff(interaction) && !isOpener) {
                return interaction.reply({ content: `${em("info")} Only staff or ticket opener can close.`, ephemeral: true })
            }
            const reason = interaction.options.getString("reason") || null
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xed3a3a)
                    .setDescription(
                        `${em("mop") || "🔒"} Closing in 7s — transcript will be generated.\n` +
                        (reason ? `**Reason:** ${reason}` : "")
                    )
                    .setTimestamp()]
            })
            await performClose(guild, channel, user, ticketData, reason)
            setTimeout(() => channel.delete().catch(() => {}), 7000)
        }

        if (sub === "rename") {
            if (!isStaff(interaction)) return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            const newName = interaction.options.getString("name")
                .toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100)
            const oldName = channel.name
            await channel.setName(newName).catch(() => {})
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x7c3aed)
                    .setDescription(`${em("info")} Renamed \`${oldName}\` → \`${newName}\` by ${user}.`)]
            })
            log("ticket_rename", {
                executorId: user.id, executorUsername: user.username,
                targetId: ticketData.userId, targetUsername: ticketData.username,
                extra: `ticket #${ticketData.number} "${oldName}" → "${newName}"`
            })
        }

        if (sub === "info") {
            const pLabel = PRIORITY_LABELS[ticketData.priority] || "🟡 Medium"
            const pColor = PRIORITY_COLORS[ticketData.priority] || 0xedcc3a
            const infoEmbed = new EmbedBuilder()
                .setColor(pColor)
                .setAuthor({
                    name: `SENZA VAULT — Ticket Info`,
                    iconURL: guild.iconURL({ dynamic: true }) ?? undefined
                })
                .setTitle(`${em('_balistic_info_') || em('info')} Ticket #${ticketData.number}`)
                .setDescription(
                    `> **${ticketData.typeLabel || "Ticket"}** — ${ticketData.claimedBy ? `claimed by <@${ticketData.claimedBy}>` : "unclaimed"}\n` +
                    `> Opened by <@${ticketData.userId}> <t:${Math.floor(ticketData.openedAt / 1000)}:R>`
                )
                .addFields(
                    { name: `${em('coin') || '📂'} Type`, value: `\`${ticketData.typeLabel || "Ticket"}\``, inline: true },
                    { name: `⚡ Priority`, value: pLabel, inline: true },
                    { name: `${em('verified') || '🔰'} Status`, value: ticketData.claimedBy ? `${em('staffteam') || '✅'} Claimed by <@${ticketData.claimedBy}>` : `${em('info') || '⏳'} Unclaimed`, inline: true },
                    { name: `${em('userslogo') || '👤'} Opened by`, value: `<@${ticketData.userId}> (\`${ticketData.username}\`)`, inline: true },
                    { name: `${em('loading') || '⏰'} Opened`, value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>`, inline: true },
                    { name: `${em('info') || '📌'} Channel`, value: `<#${channel.id}>`, inline: true }
                )
                .setTimestamp()
            if (ticketData.product) {
                infoEmbed.addFields(
                    { name: `🎮 Product`, value: `\`${ticketData.product}\``, inline: true },
                    { name: `${em('paypal') || '💳'} Payment`, value: `\`${ticketData.paymentMethod || "—"}\``, inline: true },
                    ...(ticketData.extraNotes ? [{ name: `${em('info') || '📝'} Notes`, value: ticketData.extraNotes, inline: false }] : [])
                )
            }
            return interaction.reply({ embeds: [infoEmbed] })
        }

        if (sub === "priority") {
            if (!isStaff(interaction)) return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            const level = interaction.options.getString("level")
            const oldPriority = ticketData.priority || "medium"
            ticketData.priority = level
            tickets[channel.id] = ticketData
            saveTickets(tickets)
            await channel.setTopic(
                (channel.topic || "").replace(/ \| priority:\w+/, "") + ` | priority:${level}`
            ).catch(() => {})
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(PRIORITY_COLORS[level])
                    .setDescription(`${PRIORITY_LABELS[level]} Priority: \`${oldPriority}\` → \`${level}\` by ${user}.`)]
            })
            log("ticket_priority", {
                executorId: user.id, executorUsername: user.username,
                targetId: ticketData.userId, targetUsername: ticketData.username,
                extra: `ticket #${ticketData.number} "${oldPriority}" → "${level}"`
            })
        }

        if (sub === "transcript") {
            if (!isStaff(interaction)) return interaction.reply({ content: `${em("info")} Staff only.`, ephemeral: true })
            await interaction.deferReply({ ephemeral: true })
            let allMessages = []
            try { allMessages = await fetchAllMessages(channel) } catch {}
            const html = buildTranscriptHtml(allMessages, ticketData, guild.name, user, null)
            const attachment = new AttachmentBuilder(Buffer.from(html, "utf8"), { name: `transcript-${ticketData.number}.html` })
            await channel.send({
                embeds: [new EmbedBuilder().setColor(0x5b21b6)
                    .setDescription(`${em("_balistic_info_") || em("info") || "📋"} Transcript — **${allMessages.length}** messages — generated by ${user}`)
                    .setTimestamp()],
                files: [attachment]
            })
            return interaction.editReply(`${em('verified') || '✅'} Transcript posted in this channel.`)
        }
    }
}
