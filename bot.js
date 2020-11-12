const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const { last } = require('lodash')

// TODO: better error handling

const fetch = require('node-fetch')
const { Client } = require('discord.js')
const client = new Client({partials: [
  'MESSAGE',
  'CHANNEL',
  'USER',
  'REACTION',
  'GUILD_MEMBER'
]})

client.on('raw', async (packet) => {
  const {t: type, d: data} = packet
  // console.log(packet)

  const channel = await client.channels.fetch('775930950034260008')

  switch (type) {
    case 'READY':
      await channel.messages.fetch().then((messages) => messages.map(dealWithMessage))
      const bootMessage = await channel.send(`${process.env.NODE_ENV} system booted`)

      setTimeout(() => bootMessage.delete(), 10000)
    break

    case 'MESSAGE_REACTION_ADD':
      let message = await channel.messages.fetch(data.message_id)

      if (!message.author.bot) return

      if (
        data.emoji.name !== '👍'
        && data.emoji.name !== '👎'
      ) {
        await message.reactions.cache.get(data.emoji.name).remove()
        return
      }

      await Promise.all(message.reactions.cache.map((reaction) => {
        if (reaction.emoji.name !== data.emoji.name)
          return reaction.users.remove(data.user_id)
      }))

      message = await message.fetch(true)

      await dealWithMessage(message)
    break

    default:
    return
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

async function dealWithMessage(message) {
  const upvotes = message.reactions.cache.filter((reaction) => reaction.emoji.name === '👍').first()
  const downvotes = message.reactions.cache.filter((reaction) => reaction.emoji.name === '👎').first()

  const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8787' : 'https://api-quest.stellar.buzz'

  let [ id,,badge,inspect ] = message.content.split('\n')
      id = last(id.replace(/\s/g, '').split(':'))
      badge = last(badge.replace(/\s/g, '').split(':'))
      inspect = last(inspect.replace(/\s/g, '').split(':'))

  const isDevMessage = inspect.indexOf('quest') === -1

  if (isDevMessage !== isDev)
    return

  const series = parseInt(badge.match(/\d{2}/g)[0])

  const body = {
    id,
    token: process.env.GROOT_KEY,
  }

  if (upvotes && upvotes.count >= 2) {
    console.log('accept')

    await fetch(`${baseUrl}/user/submit?series=${series}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...body,
        verified: true
      })
    })

    message.delete()
  }

  if (downvotes && downvotes.count >= 2) {
    console.log('reject')

    await fetch(`${baseUrl}/user/submit?series=${series}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...body,
        verified: false
      })
    })

    message.delete()
  }
}