const { ApplicationCommandType, ApplicationCommandOptionType, MessageFlags } = require('discord.js')
const fetch = require('node-fetch')

const db = require('./db')

module.exports.commandName = 'wololo'

module.exports.setup = async function wololoSetuo(client) {
  const commands = await client.application.commands.fetch()
  const existingCommand = commands.find(cmd => cmd.name == module.exports.commandName)
  if (!existingCommand) {
    await client.application.commands.create({
      name: module.exports.commandName,
      type: ApplicationCommandType.ChatInput,
      description: module.exports.commandName,
      dmPermission: false,
      options: [{
        name: module.exports.commandName,
        description: module.exports.commandName,
        type: ApplicationCommandOptionType.String,
        focused: true,
        required: true
      }]
    })
  }
}

module.exports.handleInteraction = async function handleWololoInteraction(interaction) {
  let wololo = interaction.options.getString(module.exports.commandName, true)
  if (await db.wololo.findFirst({
    where: {
      wololo
    }
  })) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: ':white_check_mark: Already done.'
    })
    return
  }

  const res = await fetch(`https://api.stellar.quest/utils/wololo/${wololo}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WOLOLO_KEY}`
    }
  })

  if (res.ok) {
    await Promise.all([
      interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: ':white_check_mark: Success.'
      }),
      db.wololo.create({
        data: {
          wololo,
          trigger: interaction.member.user.id
        }
      })
    ])
    return
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    conten: ':x: Failure.'
  })
}