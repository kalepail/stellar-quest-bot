const fetch = require('node-fetch')
const { ComponentType, ButtonStyle, MessageFlags } = require('discord.js')
const { isBefore, addWeeks } = require('date-fns')

const db = require('./db')

module.exports.interactionCustomId = 'verify-user'

// Sets up a message in process.env.VERIFICATION_CHANNEL_ID if this channel is empty
module.exports.setupVerificationChannel = async function setupVerificationChannel(client) {
  const channel = await client.channels.fetch(process.env.VERIFICATION_CHANNEL_ID)
  const needsSetup = await channel.messages.fetch({ limit: 1 })
    .then(messages => messages.size === 0)

  if (needsSetup) {
    await channel.send({
      content: `In order to send messages in our server you'll need to complete a few Quests first. 
Once you've done so just press the button below!`,
      components: [{
        type: ComponentType.ActionRow,
        components: [{
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: 'Verify Me',
          custom_id: module.exports.interactionCustomId
        }]
      }]
    })
  }
}



module.exports.handleVerification = async function handleVerification(interaction) {
  const { id } = interaction.member.user
  const alreadyVerified = await db.verifiedUser.findUnique({
    where: {
      id
    }
  })

  if (
    alreadyVerified
    && isBefore(new Date(), addWeeks(alreadyVerified.verifiedAt, 4))
  ) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `:white_check_mark: You've already been verified!`
    })

    return
  }

  const shouldBeVerified = await fetch(`https://api.stellar.quest/user/${id}?verified=true`)
    .then(res => res.json())
    .then(user => user.verified)

  if (!shouldBeVerified) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: ':x: Please solve a few more Quests then try again'
    })

    return
  }

  // we wait for the role, if adding the role fails,
  // we would lock out the user for a month
  // so we store state and reply later
  await interaction.member.roles.add(process.env.VERIFIED_ROLE_ID)

  await Promise.all([
    db.verifiedUser.upsert({
      update: {
        verifiedAt: new Date(),
      },
      where: {
        id
      },
      create: {
        id
      }
    }),

    // if we dont "reply" discord will flag this interaction as failed
    interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: ':white_check_mark: You have been verified!'
    })
  ])
}