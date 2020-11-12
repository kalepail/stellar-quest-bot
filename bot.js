const isDev = process.env.NODE_ENV === 'development'

if (isDev)
  require('dotenv').config()

const { last, compact } = require('lodash')

// TODO: better error handling
// TODO: only one message per unverified user, maybe update when new ones come in (increment counter or something, {x} pending prizes)

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
  try {
    const {t: type, d: data} = packet
    // console.log(packet)

    switch (type) {
      case 'READY':
        const fraudChannel = await client.channels.fetch('775930950034260008', true, true)
        await fraudChannel.messages.fetch({limit: 50}, true, true).then((messages) => messages.map(dealWithMessage))

        // const bootMessage = await fraudChannel.send(`${process.env.NODE_ENV} system booted`)
        // setTimeout(() => bootMessage.delete(), 10000)
      break

      case 'MESSAGE_REACTION_ADD':
        const channel = await client.channels.fetch(data.channel_id)

        let message = await channel.messages.fetch(data.message_id, true, true)

        if (data.channel_id === '775930950034260008') {
          if (!message.author.bot)
            return

          if (
            data.emoji.name !== '👍'
            && data.emoji.name !== '👎'
          ) await message.reactions.cache.get(data.emoji.name).remove()

          else {
            await Promise.all(message.reactions.cache.map((reaction) => {
              if (reaction.emoji.name !== data.emoji.name)
                return reaction.users.remove(data.user_id)
            }))

            message = await message.fetch(true)

            await dealWithMessage(message)
          }
        }

        else if (data.emoji.name === '⚠️') {
          const legitWarnFlags = await message.reactions.cache.map(async (reaction) => {
            const hasPower = await Promise.all(
              reaction.users.cache.map(async (user) => {
                await reaction.message.guild.members.fetch({
                  user,
                  cache: true,
                  force: true,
                })

                const member = reaction.message.guild.members.cache.get(user.id)

                return (
                  member.roles.cache.has('763799716546215977') // Admin
                  || member.roles.cache.has('765215960863997962') // SDF
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

client.login(process.env.DISCORD_BOT_TOKEN)

async function dealWithMessage(message) {
  console.log(message)

  if (message.content.indexOf('system') > -1)
    return

  const upvotes = message.reactions.cache.filter((reaction) => reaction.emoji.name === '👍').first()
  const downvotes = message.reactions.cache.filter((reaction) => reaction.emoji.name === '👎').first()

  const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8787' : 'https://api-quest.stellar.buzz'

  let [
    id,
    ,
    badge,
    inspect
  ] = message.content.split('\n')
  id = last(id.replace(/\s/g, '').split(':'))
  badge = last(badge.replace(/\s/g, '').split(':'))
  inspect = last(inspect.replace(/\s/g, '').split(':'))

  const isDevMessage = inspect.indexOf('quest') === -1

  // if (isDevMessage !== isDev)
  //   return

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

    // message.delete()
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

    // message.delete()
  }
}