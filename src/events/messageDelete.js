const { log } = require('../utils/logger')

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        if (!message.guild || message.author?.bot) return
        const preview = message.content ? message.content.slice(0, 120) : '[attachment/embed]'
        log('message_delete', {
            targetId: message.author?.id || null,
            targetUsername: message.author?.username || null,
            extra: `#${message.channel.name} — "${preview}"`
        })
    }
}
