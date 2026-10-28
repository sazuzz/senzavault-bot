const { log } = require('../utils/logger')

module.exports = {
    name: 'guildBanAdd',
    async execute(ban) {
        log('member_ban', {
            targetId: ban.user.id,
            targetUsername: ban.user.username,
            extra: ban.reason ? `reason: ${ban.reason}` : 'no reason provided'
        })
    }
}
