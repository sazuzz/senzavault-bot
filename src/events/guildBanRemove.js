const { log } = require('../utils/logger')

module.exports = {
    name: 'guildBanRemove',
    async execute(ban) {
        log('member_unban', {
            targetId: ban.user.id,
            targetUsername: ban.user.username
        })
    }
}
