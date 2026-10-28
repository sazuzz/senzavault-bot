const { log } = require('../utils/logger')

module.exports = {
    name: 'messageUpdate',
    async execute(oldMsg, newMsg) {
        if (!newMsg.guild || newMsg.author?.bot) return
        if (oldMsg.content === newMsg.content) return
        const before = (oldMsg.content || '').slice(0, 80)
        const after = (newMsg.content || '').slice(0, 80)
        log('message_edit', {
            targetId: newMsg.author?.id || null,
            targetUsername: newMsg.author?.username || null,
            extra: `#${newMsg.channel.name} — "${before}" → "${after}"`
        })
    }
}
