let _client = null

function setClient(client) { _client = client }

function e(guild, name) {
    const lower = name.toLowerCase()
    const local = guild?.emojis?.cache?.find(em => em.name?.toLowerCase() === lower)
    if (local) return local.toString()
    if (_client) {
        const global = _client.emojis.cache.find(em => em.name?.toLowerCase() === lower)
        if (global) return global.toString()
    }
    return ''
}

// For button/select setEmoji() calls — returns {id,name,animated} or {name: fallback}
function ge(guild, name, fallback) {
    const lower = name.toLowerCase()
    const found = guild?.emojis?.cache?.find(em => em.name?.toLowerCase() === lower)
        ?? _client?.emojis?.cache?.find(em => em.name?.toLowerCase() === lower)
    return found ? { id: found.id, name: found.name, animated: found.animated } : { name: fallback }
}

module.exports = { e, ge, setClient }
