const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const { findIndex } = require('lodash')
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

const hook = new WebhookClient('776151831021486140', 'OSMo60PRHjcYbd42VPMEwWtx2fPQilWCPDTx4gZMz0_4jcjZ-cW9x2wMWmbV8vd1c9r2')

;

call()
.then((res) => console.log(res))
.catch((err) => console.error(err))
.finally(() => process.exit())

async function call() {
  await client.login(process.env.DISCORD_BOT_TOKEN)

  return fetch(`https://api-quest.stellar.buzz/utils/pending?series=2&token=${process.env.GROOT_KEY}`)
  .then(async (res) => {
    const body = await res.json()
    const fraudChannel = await client.channels.fetch('775930950034260008', true, true)
    const verifyChannel = await client.channels.fetch('764096940450250763', true, true)

    if (res.ok) {
      let fcFetched
      let vcFetched

      do {
        fcFetched = await fraudChannel.messages.fetch({limit: 100}, true, true)

        fcFetched = fcFetched.filter((message) => {
          if (message.author.username.indexOf('→') === -1)
            return true

          const id = message.author.username.split('→')[1].trim()
          const index = findIndex(body, {id})

          if (index > -1) {
            body.splice(index, 1)
            return false
          }
        })

        await fraudChannel.bulkDelete(fcFetched)
      } while(fcFetched.size >= 1)

      do {
        vcFetched = await verifyChannel.messages.fetch({limit: 100}, true, true)

        vcFetched = vcFetched.filter((message) =>
          moment.utc(message.createdTimestamp, 'x').isBefore(moment.utc().subtract(24, 'hours'))
        )

        // await Bluebird.mapSeries((vcFetched), ([id, message]) => {
        //   console.log('deleted', id)
        //   return message.delete()
        // })

        await verifyChannel.bulkDelete(vcFetched)
      } while(vcFetched.size >= 1)

      await new Bluebird.mapSeries(body, (user) => {
        const webhookOptions = {
          username: user.id
        }

        if (user.authHash) {
          const authHash = JSON.parse(Buffer.from(user.authHash, 'base64').toString())

          if (authHash.avatar)
            webhookOptions.avatarURL = `https://cdn.discordapp.com/avatars/${session.aud}/${authHash.avatar}.png`
          else
            webhookOptions.avatarURL = `https://cdn.discordapp.com/embed/avatars/${authHash.discriminator % 5}.png`

          webhookOptions.username = `${authHash.username} → ${authHash.id}`
        }

        return hook.send(`<${isDev ? 'http://localhost:3333' : 'https://quest.stellar.org'}/users/inspect/${user.id}>`, webhookOptions)
      })

      return `Added ${body.length} pending users`
    }

    else
      throw body
  })
}