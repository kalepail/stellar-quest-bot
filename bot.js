const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const { compact } = require('lodash')
const userVerification = require('./user-verification')

// const fetch = require('node-fetch')
const { Client, Partials, GatewayIntentBits } = require('discord.js')

const client = new Client({
  partials: [
    Partials.Message,
    Partials.User,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
  ],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ]
})

// const baseUrl = isDev ? 'http://127.0.0.1:8787' : 'https://api-quest.stellar.buzz'

client.on('raw', async (packet) => {
  try {
    const {t: type, d: data} = packet
    // console.log(packet)

    switch (type) {
      case 'READY':
        await userVerification.setupVerificationChannel(client)
      break

      case 'MESSAGE_REACTION_ADD':
        const channel = await client.channels.fetch(data.channel_id, true, true)
        let message = await channel.messages.fetch(data.message_id, true, true)

        if (data.emoji.name === '⚠️') {
          const legitWarnFlags = await message.reactions.cache
          .filter((reaction) => reaction.emoji.name === '⚠️')
          .map(async (reaction) => {
            await reaction.users.fetch()

            const hasPower = await Promise.all(
              reaction.users.cache.map(async (user) => {
                const member = await reaction.message.guild.members.fetch({
                  user,
                  force: true,
                })

                return (
                  member.roles.cache.has('763799716546215977') // Admin
                  || member.roles.cache.has('766768688342499390') // Lumenaut
                )
              })
            ).then(compact)

            return hasPower.length
          })[0]

          if (legitWarnFlags >= 2)
            await message.delete()
        }
      break

      default:
      return
    }
  }

  catch(err) {
    console.error(err)
  }
})

client.on('interactionCreate', async interaction => {
  if (interaction.customId == 'verify-user') {
    userVerification.handleVerification(interaction).catch(console.error)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)