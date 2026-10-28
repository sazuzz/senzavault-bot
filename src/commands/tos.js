const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const { e } = require('../utils/emojis')

function buildTOSEmbed(guild = null) {
    const em = (name) => e(guild, name)
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({
            name: `${em('senzalogo')} SENZA VAULT — Terms of Service`,
            iconURL: guild?.iconURL({ dynamic: true, size: 64 }) ?? undefined
        })
        .setTitle(`${em('senzalogo')} Terms of Service`)
        .setDescription(
            '> By accessing or using any **Senza Vault** service, you agree to be bound by these Terms.\n' +
            '> If you disagree, stop using the product immediately.\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .addFields(
            {
                name: `${em('paypal')} Payment Terms`,
                value:
                    'We accept **PayPal**, **Crypto (ALL)**, **Stripe**, and **Paysafecard**.\n' +
                    'All prices are in USD. Verify the price before purchasing.\n' +
                    'Payments are immediately final.'
            },
            {
                name: `${em('coin')} Refunds`,
                value:
                    'All sales are **final**. No refunds, returns, or cancellations after delivery.\n' +
                    'Read product details and ask questions **before** buying.'
            },
            {
                name: `${em('admin')} Prohibited Conduct`,
                value:
                    '**Strictly prohibited:**\n' +
                    '— Sharing, reselling, or redistributing our products.\n' +
                    '— Any suspicious or harmful activity related to our services.\n' +
                    'Violations result in **permanent ban**, license revocation, and total access loss without refund.'
            },
            {
                name: `${em('info')} Limitation of Liability`,
                value:
                    'To the maximum extent permitted by law, **Senza Vault** is not responsible for indirect, incidental, or punitive damages.\n' +
                    'Maximum liability shall not exceed the amount paid for the product.'
            },
            {
                name: `${em('userslogo')} User Responsibility`,
                value:
                    'You are solely responsible for ensuring your use complies with all applicable laws.\n' +
                    'Misuse is entirely your responsibility.'
            },
            {
                name: `${em('star')} Indemnification`,
                value:
                    'You agree to defend, indemnify, and hold harmless **Senza Vault** and its team from any claims arising from your use or violation of these terms.'
            },
            {
                name: `${em('boost')} Updates`,
                value:
                    'We reserve the right to update these terms at any time.\n' +
                    'Continued use after an update constitutes acceptance of the new terms.'
            },
            {
                name: `${em('support')} Contact`,
                value:
                    'Open a ticket in our server or contact staff directly.\n' +
                    'discord.gg/senzavault'
            }
        )
        .setFooter({ text: 'Senza Vault  •  By purchasing you accept these terms' })
        .setTimestamp()
}

module.exports = {
    buildTOSEmbed,

    data: new SlashCommandBuilder()
        .setName('tos')
        .setDescription('Show Senza Vault Terms of Service')
        .addBooleanOption(opt =>
            opt.setName('publico')
                .setDescription('Post publicly? (default: only you see it)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const publico = interaction.options.getBoolean('publico') ?? false
        await interaction.reply({ embeds: [buildTOSEmbed(interaction.guild)], ephemeral: !publico })
    }
}
