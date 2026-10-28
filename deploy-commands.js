require('dotenv').config()
const { REST, Routes } = require('discord.js')
const fs = require('fs')
const path = require('path')

const commands = []
const commandsPath = path.join(__dirname, 'src', 'commands')
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))

for (const file of files) {
    const cmd = require(path.join(commandsPath, file))
    if (cmd.data) commands.push(cmd.data.toJSON())
}

const rest = new REST().setToken(process.env.TOKEN)

;(async () => {
    try {
        console.log(`Registrando ${commands.length} comandos...`)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        )
        console.log(`✅ ${data.length} comandos registrados globalmente.`)
    } catch (err) {
        console.error(err)
    }
})()
