const { log } = require('../utils/logger')

const BOOSTER_ROLE_ID      = process.env.BOOSTER_ROLE_ID
const BOOSTER_GIFT_ROLE_ID = process.env.BOOSTER_GIFT_ROLE_ID

async function syncRole(member, roleId, add, label) {
    if (!roleId) return
    const role = member.guild.roles.cache.get(roleId)
    if (!role) return
    const has = member.roles.cache.has(roleId)
    if (add && !has) {
        await member.roles.add(role).catch(() => {})
        log('role_add', {
            executorId: null,
            executorUsername: 'AutoBoost',
            targetId: member.user.id,
            targetUsername: member.user.username,
            roleId: role.id,
            roleName: role.name,
            extra: label
        })
    } else if (!add && has) {
        await member.roles.remove(role).catch(() => {})
        log('role_remove', {
            executorId: null,
            executorUsername: 'AutoBoost',
            targetId: member.user.id,
            targetUsername: member.user.username,
            roleId: role.id,
            roleName: role.name,
            extra: label
        })
    }
}

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        if (oldMember.nickname !== newMember.nickname) {
            log('nickname_change', {
                targetId: newMember.user.id,
                targetUsername: newMember.user.username,
                extra: `"${oldMember.nickname || oldMember.user.username}" → "${newMember.nickname || newMember.user.username}"`
            })
        }

        const wasBooster = !!oldMember.premiumSince
        const isBooster  = !!newMember.premiumSince

        if (!wasBooster && isBooster) {
            await syncRole(newMember, BOOSTER_ROLE_ID,      true,  'auto-assigned on server boost')
            await syncRole(newMember, BOOSTER_GIFT_ROLE_ID, true,  'auto-assigned on server boost (gift)')
        }

        if (wasBooster && !isBooster) {
            await syncRole(newMember, BOOSTER_ROLE_ID,      false, 'auto-removed on boost expiry')
            await syncRole(newMember, BOOSTER_GIFT_ROLE_ID, false, 'auto-removed on boost expiry (gift)')
        }
    }
}
