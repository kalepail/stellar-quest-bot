const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const { findIndex, uniqBy } = require('lodash')
const moment = require('moment')
const Bluebird = require('bluebird')

const fetch = require('node-fetch')
const { Client, WebhookClient } = require('discord.js')
const client = new Client({partials: [
  'MESSAGE',
  'CHANNEL',
  'USER',
  'REACTION',
  'GUILD_MEMBER'
]})

const hook = new WebhookClient('776151831021486140', process.env.DISCORD_WEBHOOK_TOKEN)

call()
.then((res) => console.log(res))
.catch((err) => console.error(err))
.finally(() => process.exit())

async function call() {
  await client.login(process.env.DISCORD_BOT_TOKEN)

  const fraudChannel = await client.channels.fetch('775930950034260008', true, true)
  const verifyChannel = await client.channels.fetch('764096940450250763', true, true)

  let fcFetched
  let vcFetched
  let pendingUsers = []

  await Bluebird.mapSeries([
    1,
    2
  ], (i) =>
    fetch(`https://api-quest.stellar.buzz/utils/pending?series=${i}&token=${process.env.GROOT_KEY}`)
    .then(async (res) => {
      if (res.ok)
        pendingUsers.push(...await res.json())
    })
  )

  pendingUsers = uniqBy(pendingUsers, 'id')

  do {
    fcFetched = await fraudChannel.messages.fetch({limit: 100}, true, true)

    fcFetched = fcFetched.filter((message) => {
      if (message.author.username.indexOf('→') === -1)
        return true

      const id = message.author.username.split('→')[1].trim()
      const index = findIndex(pendingUsers, {id})

      if (index > -1) {
        pendingUsers.splice(index, 1)
        return false
      }
    })

    await fraudChannel.bulkDelete(fcFetched)
  } while(fcFetched.size >= 1)

  await new Bluebird.mapSeries(pendingUsers, (user) => {
    const webhookOptions = {
      username: user.id
    }

    if (user.authHash) {
      const authHash = JSON.parse(Buffer.from(user.authHash, 'base64').toString())

      if (authHash.avatar)
        webhookOptions.avatarURL = `https://cdn.discordapp.com/avatars/${user.id}/${authHash.avatar}.png`
      else
        webhookOptions.avatarURL = `https://cdn.discordapp.com/embed/avatars/${authHash.discriminator % 5}.png`

      webhookOptions.username = `${authHash.username} → ${authHash.id}`
    }

    return hook.send(`<${isDev ? 'http://localhost:3333' : 'https://quest.stellar.org'}/users/inspect/${user.id}>`, webhookOptions)
  })

  do {
    vcFetched = await verifyChannel.messages.fetch({limit: 100}, true, true)

    vcFetched = vcFetched.filter((message) =>
      vcFetched.filter((message) =>
        message.reactions.cache.has('✅')
      ).map((message) => message.author.id)
      .indexOf(message.author.id) > -1
      || moment.utc(message.createdTimestamp, 'x').isBefore(moment.utc().subtract(36, 'hours'))
    )

    // Only needed if messages are older than two weeks
    // await Bluebird.mapSeries((vcFetched), ([id, message]) => {
    //   console.log('deleted', id)
    //   return message.delete()
    // })

    await verifyChannel.bulkDelete(vcFetched)
  } while(vcFetched.size >= 1)

  return `Added ${pendingUsers.length} pending users`
}