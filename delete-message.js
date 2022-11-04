const { compact } = require('lodash')

module.exports.deleteMessage = async function(client, data) {
  const channel = await client.channels.fetch(data.channel_id, true, true)
  const message = await channel.messages.fetch(data.message_id, true, true)

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
}