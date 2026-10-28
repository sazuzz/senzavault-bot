const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require("discord.js")
const { e } = require("../utils/emojis")
const fs = require("fs")
const path = require("path")

const GW_PATH = path.join(__dirname, "..", "..", "data", "giveaways.json")

function readGW() {
    try { return JSON.parse(fs.readFileSync(GW_PATH, "utf8")) } catch { return {} }
}
function saveGW(data) {
    fs.writeFileSync(GW_PATH, JSON.stringify(data, null, 2), "utf8")
}

function parseTime(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return null
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    return parseInt(match[1]) * units[match[2]]
}

function formatDuration(ms) {
    if (ms >= 86400000) return `${Math.round(ms / 86400000)}d`
    if (ms >= 3600000) return `${Math.round(ms / 3600000)}h`
    if (ms >= 60000) return `${Math.round(ms / 60000)}m`
    return `${Math.round(ms / 1000)}s`
}

function pickWinners(entries, count, weights) {
    // Build weighted pool — each user gets `slots` tickets
    const pool = []
    for (const userId of entries) {
        const slots = weights?.[userId] ?? 2
        for (let i = 0; i < slots; i++) pool.push(userId)
    }
    const winners = []
    while (winners.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length)
        const winner = pool[idx]
        winners.push(winner)
        // Remove ALL slots for this winner so they can't win twice
        for (let i = pool.length - 1; i >= 0; i--) {
            if (pool[i] === winner) pool.splice(i, 1)
        }
    }
    return winners
}

function buildGiveawayEmbed(guild, gw) {
    const em = (name) => e(guild, name)
    const endsTs = Math.floor(gw.endsAt / 1000)
    const entriesCount = gw.entries.length

    const roleStr = gw.requiredRoleId ? `\n> ${em("staffteam") || "🎖️"} **Required Role:** <@&${gw.requiredRoleId}>` : ""

    return new EmbedBuilder()
        .setColor(gw.ended ? 0x5b21b6 : 0x7c3aed)
        .setAuthor({
            name: `SENZA VAULT — GIVEAWAY`,
            iconURL: guild.iconURL({ dynamic: true }) ?? undefined
        })
        .setTitle(`${em("star") || "⭐"} ${gw.prize}`)
        .setDescription(
            gw.ended
                ? `${em("coin") || "🎊"} **Giveaway ended!**\n\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  (gw.winnerIds?.length
                      ? `${em("boost") || "🏆"} **Winner${gw.winnerIds.length > 1 ? "s" : ""}:**\n> ${gw.winnerIds.map(id => `<@${id}>`).join(", ")}`
                      : `${em("info") || "ℹ️"} No valid entries — no winner selected.`)
                : `${em("support") || "🎯"} Click **Enter** below to join the giveaway!\n\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> ${em("boost") || "⏰"} **Ends:** <t:${endsTs}:R>\n` +
                  `> ${em("info") || "📅"} **Date:** <t:${endsTs}:f>\n` +
                  `> ${em("info") || "🏅"} **Winners:** \`${gw.winnersCount}\`\n` +
                  `> ${em("userslogo") || "👥"} **Entries:** \`${entriesCount}\`\n` +
                  `> ${em("staffteam") || "👤"} **Host:** <@${gw.hostId}>` +
                  roleStr +
                  (gw.inviteBonus
                      ? `\n> ${em("star") || "⭐"} **Bonus:** Invite multiplier active\n> \`x1.0\` base  ·  \`+0.5x\` per server invite`
                      : '')
        )
        .setFooter({
            text: gw.ended
                ? `Giveaway ended  •  ${entriesCount} total entries`
                : `Senza Vault  •  ${entriesCount} ${entriesCount === 1 ? "entry" : "entries"}  •  React to enter`
        })
        .setTimestamp()
}

const activeTimers = new Map()

function scheduleEnd(client, gwId, delay) {
    if (activeTimers.has(gwId)) clearTimeout(activeTimers.get(gwId))
    const timer = setTimeout(() => endGiveaway(client, gwId), delay)
    activeTimers.set(gwId, timer)
}

async function endGiveaway(client, gwId) {
    const gws = readGW()
    const gw = gws[gwId]
    if (!gw || gw.ended) return

    const winners = pickWinners(gw.entries, gw.winnersCount, gw.entryWeights)
    gw.ended = true
    gw.winnerIds = winners
    saveGW(gws)
    activeTimers.delete(gwId)

    try {
        const channel = await client.channels.fetch(gw.channelId)
        const msg = await channel.messages.fetch(gwId)

        const guild = channel.guild
        await msg.edit({ embeds: [buildGiveawayEmbed(guild, gw)], components: [buildEndedRow(guild)] })

        if (winners.length > 0) {
            const em = (name) => e(guild, name)
            const winnerMentions = winners.map(id => `<@${id}>`).join(", ")
            await channel.send({
                content: `${em("star")} Congrats ${winnerMentions}! You won **${gw.prize}**! ${em("senzalogo")}`
            })
        } else {
            await channel.send({ content: `${e(guild, "info")} No valid entries for **${gw.prize}** — no winner selected.` })
        }
    } catch {}
}

function ge(guild, name, fallback) {
    if (!guild) return { name: fallback }
    const found = guild.emojis.cache.find(em => em.name === name)
    return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
}

function buildEnterRow(guild, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("gw_enter")
            .setLabel("Enter Giveaway")
            .setEmoji(ge(guild, "star", "🎉"))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId("gw_entries")
            .setLabel("View Entries")
            .setEmoji(ge(guild, "userslogo", "👥"))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    )
}

function buildEndedRow(guild) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("gw_enter")
            .setLabel("Giveaway Ended")
            .setEmoji(ge(guild, "coin", "🎊"))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("gw_entries")
            .setLabel("View Entries")
            .setEmoji(ge(guild, "userslogo", "👥"))
            .setStyle(ButtonStyle.Secondary)
    )
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Giveaway management")
        .addSubcommand(sub =>
            sub.setName("start")
                .setDescription("Start a new giveaway")
                .addStringOption(opt =>
                    opt.setName("prize").setDescription("What are you giving away?").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("duration").setDescription("Duration: 10m, 2h, 1d").setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName("winners").setDescription("Number of winners (default 1)").setMinValue(1).setMaxValue(10).setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName("channel").setDescription("Channel to post in (default: current)").setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName("required_role").setDescription("Role required to enter (optional)").setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName("bonus")
                        .setDescription("Invite multiplier: x1 base, +0.5x per invite (1 invite = x1.5, 2 = x2...)")
                        .setRequired(false)
                        .addChoices(
                            { name: "✅ Yes — enable invite bonus", value: "yes" },
                            { name: "❌ No — standard entries", value: "no" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName("end")
                .setDescription("End a giveaway early")
                .addStringOption(opt =>
                    opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("reroll")
                .setDescription("Reroll winner(s) for an ended giveaway")
                .addStringOption(opt =>
                    opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName("winners").setDescription("How many new winners to pick (default: same as original)").setMinValue(1).setMaxValue(10).setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all active giveaways")
        )
        .addSubcommand(sub =>
            sub.setName("cancel")
                .setDescription("Cancel and delete a giveaway")
                .addStringOption(opt =>
                    opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand()
        const g = interaction.guild
        const em = (name) => e(g, name)

        if (sub === "start") {
            await interaction.deferReply({ ephemeral: true })
            const prize = interaction.options.getString("prize")
            const durationStr = interaction.options.getString("duration")
            const winnersCount = interaction.options.getInteger("winners") ?? 1
            const targetChannel = interaction.options.getChannel("channel") ?? interaction.channel

            const ms = parseTime(durationStr)
            if (!ms) return interaction.editReply("Invalid duration. Use: 10s, 5m, 2h, 1d")

            const requiredRole = interaction.options.getRole("required_role")
            const bonusOpt = interaction.options.getString("bonus") ?? "no"
            const endsAt = Date.now() + ms
            const gw = {
                prize,
                channelId: targetChannel.id,
                winnersCount,
                endsAt,
                hostId: interaction.user.id,
                entries: [],
                ended: false,
                winnerIds: [],
                requiredRoleId: requiredRole?.id ?? null,
                inviteBonus: bonusOpt === "yes",
                entryWeights: bonusOpt === "yes" ? {} : null
            }

            const embed = buildGiveawayEmbed(g, gw)
            const msg = await targetChannel.send({ embeds: [embed], components: [buildEnterRow(g)] })

            const gws = readGW()
            gws[msg.id] = gw
            saveGW(gws)

            scheduleEnd(interaction.client, msg.id, ms)

            return interaction.editReply(
                `${em("star")} Giveaway started in ${targetChannel}!\n` +
                `Prize: **${prize}** | Duration: \`${formatDuration(ms)}\` | Winners: \`${winnersCount}\`\n` +
                `Message ID: \`${msg.id}\``
            )
        }

        if (sub === "end") {
            const msgId = interaction.options.getString("message_id")
            const gws = readGW()
            if (!gws[msgId]) return interaction.reply({ content: "Giveaway not found.", ephemeral: true })
            if (gws[msgId].ended) return interaction.reply({ content: "That giveaway already ended.", ephemeral: true })
            await interaction.deferReply({ ephemeral: true })
            await endGiveaway(interaction.client, msgId)
            return interaction.editReply(`${em("coin")} Giveaway ended early.`)
        }

        if (sub === "reroll") {
            const msgId = interaction.options.getString("message_id")
            const newCount = interaction.options.getInteger("winners")
            const gws = readGW()
            const gw = gws[msgId]
            if (!gw) return interaction.reply({ content: "Giveaway not found.", ephemeral: true })
            if (!gw.ended) return interaction.reply({ content: "End the giveaway first before rerolling.", ephemeral: true })
            await interaction.deferReply({ ephemeral: true })

            const count = newCount ?? gw.winnersCount
            const winners = pickWinners(gw.entries, count, gw.entryWeights)
            gw.winnerIds = winners
            saveGW(gws)

            try {
                const channel = await interaction.client.channels.fetch(gw.channelId)
                const msg = await channel.messages.fetch(msgId)
                await msg.edit({ embeds: [buildGiveawayEmbed(g, gw)], components: [buildEndedRow(g)] })

                if (winners.length > 0) {
                    const winnerMentions = winners.map(id => `<@${id}>`).join(", ")
                    await channel.send({
                        content: `${em("boost")} Reroll! New winner${winners.length > 1 ? "s" : ""}: ${winnerMentions}! Congrats for **${gw.prize}**! ${em("senzalogo")}`
                    })
                }
            } catch {}
            return interaction.editReply(`${em("star")} Rerolled ${count} winner(s).`)
        }

        if (sub === "list") {
            const gws = readGW()
            const active = Object.entries(gws).filter(([, g]) => !g.ended)
            if (active.length === 0) return interaction.reply({ content: `${em("info")} No active giveaways.`, ephemeral: true })

            const lines = active.map(([id, gw]) => {
                const ts = Math.floor(gw.endsAt / 1000)
                return `${em("star")} **${gw.prize}** — ends <t:${ts}:R> | \`${gw.entries.length}\` entries | [#${interaction.guild.channels.cache.get(gw.channelId)?.name ?? gw.channelId}] \`${id}\``
            })

            const embed = new EmbedBuilder()
                .setColor(0x7c3aed)
                .setTitle(`${em("senzalogo")} Active Giveaways`)
                .setDescription(lines.join("\n"))
                .setFooter({ text: "Senza Vault" })
                .setTimestamp()

            return interaction.reply({ embeds: [embed], ephemeral: true })
        }

        if (sub === "cancel") {
            const msgId = interaction.options.getString("message_id")
            const gws = readGW()
            if (!gws[msgId]) return interaction.reply({ content: "Giveaway not found.", ephemeral: true })
            await interaction.deferReply({ ephemeral: true })

            if (activeTimers.has(msgId)) {
                clearTimeout(activeTimers.get(msgId))
                activeTimers.delete(msgId)
            }

            try {
                const channel = await interaction.client.channels.fetch(gws[msgId].channelId)
                const msg = await channel.messages.fetch(msgId)
                await msg.delete()
            } catch {}

            delete gws[msgId]
            saveGW(gws)
            return interaction.editReply(`${em("admin")} Giveaway cancelled and deleted.`)
        }
    },

    async handleButton(interaction) {
        const gws = readGW()
        const msgId = interaction.message.id
        const gw = gws[msgId]
        if (!gw) return interaction.reply({ content: "Giveaway data not found.", ephemeral: true })

        const g = interaction.guild
        const em = (name) => e(g, name)

        if (interaction.customId === "gw_entries") {
            if (gw.entries.length === 0) return interaction.reply({ content: `${em("info")} No entries yet.`, ephemeral: true })
            const sample = gw.entries.slice(0, 20).map(id => `<@${id}>`).join(", ")
            const more = gw.entries.length > 20 ? ` +${gw.entries.length - 20} more` : ""
            return interaction.reply({
                content: `${em("userslogo")} **${gw.entries.length} entr${gw.entries.length === 1 ? "y" : "ies"}:** ${sample}${more}`,
                ephemeral: true
            })
        }

        if (interaction.customId === "gw_enter") {
            if (gw.ended) return interaction.reply({ content: `${em("info")} This giveaway has ended.`, ephemeral: true })

            if (gw.requiredRoleId) {
                const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
                if (!member?.roles?.cache?.has(gw.requiredRoleId)) {
                    return interaction.reply({ content: `${em("info")} You need <@&${gw.requiredRoleId}> to enter this giveaway.`, ephemeral: true })
                }
            }

            const userId = interaction.user.id
            if (gw.entries.includes(userId)) {
                // Toggle out
                gw.entries = gw.entries.filter(id => id !== userId)
                if (gw.entryWeights) delete gw.entryWeights[userId]
                saveGW(gws)
                await interaction.message.edit({ embeds: [buildGiveawayEmbed(g, gw)], components: [buildEnterRow(g)] })
                return interaction.reply({ content: `${em("info")} Removed your entry from **${gw.prize}**.`, ephemeral: true })
            }

            // Calculate invite weight if bonus enabled
            let slots = 2  // x1.0 base (2 slots = base unit)
            let inviteCount = 0
            if (gw.inviteBonus) {
                try {
                    const invites = await interaction.guild.invites.fetch()
                    inviteCount = invites
                        .filter(inv => inv.inviter?.id === userId)
                        .reduce((sum, inv) => sum + (inv.uses ?? 0), 0)
                    slots = 2 + inviteCount  // +1 slot per invite = +0.5x
                } catch {}
                if (!gw.entryWeights) gw.entryWeights = {}
                gw.entryWeights[userId] = slots
            }

            gw.entries.push(userId)
            saveGW(gws)
            await interaction.message.edit({ embeds: [buildGiveawayEmbed(g, gw)], components: [buildEnterRow(g)] })

            const multiplier = (slots / 2).toFixed(1)
            const bonusLine = gw.inviteBonus
                ? `\n${em("star")} Multiplier: **x${multiplier}** (${inviteCount} invite${inviteCount !== 1 ? "s" : ""})`
                : ''
            return interaction.reply({
                content: `${em("star")} You entered **${gw.prize}**! Good luck! ${em("boost")}${bonusLine}\nClick again to withdraw.`,
                ephemeral: true
            })
        }
    },

    restoreTimers(client) {
        const gws = readGW()
        let restored = 0
        for (const [id, gw] of Object.entries(gws)) {
            if (gw.ended) continue
            const remaining = gw.endsAt - Date.now()
            if (remaining <= 0) {
                endGiveaway(client, id)
            } else {
                scheduleEnd(client, id, remaining)
                restored++
            }
        }
        if (restored > 0) console.log(`[Giveaway] Restored ${restored} active giveaway timer(s)`)
    }
}
