const { log } = require('../utils/logger')

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        log('member_leave', {
            targetId: member.user.id,
            targetUsername: member.user.username,
            extra: `roles: ${member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'none'}`
        })
    }
}
