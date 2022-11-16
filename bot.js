const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const userVerification = require('./user-verification')
const wololo = require('./wololo')
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
  ]
})

client.on('ready', async () => {
  await userVerification.setupVerificationChannel(client)
  await wololo.setup(client)
})

client.on('interactionCreate', async interaction => {
  if (interaction.customId == userVerification.interactionCustomId) {
    userVerification.handleVerification(interaction).catch(console.error)
  }

  if (interaction.commandName == wololo.commandName) {
    wololo.handleInteraction(interaction).catch(console.error)
  }


})

client.login(process.env.DISCORD_BOT_TOKEN)