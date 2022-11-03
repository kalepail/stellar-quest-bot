const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')
const { ComponentType, ButtonStyle, MessageFlags } = require('discord.js')
const { isBefore, addWeeks } = require('date-fns')

const db = new PrismaClient()

// Sets up a message in process.env.VERIFICATION_CHANNEL_ID if this channel is empty
module.exports.setupVerificationChannel = async function setupVerificationChannel(client) {
  const channel = await client.channels.fetch(process.env.VERIFICATION_CHANNEL_ID)
  const needsSetup = await channel.messages.fetch({ limit: 1 })
    .then(messages => messages.size === 0)

  if (needsSetup) {
    await channel.send({
      content: 'Please complete a few quests and then use the button below to get write access to this discord.',
      components: [{
        type: ComponentType.ActionRow,
        components: [{
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: 'Verify me',
          custom_id: 'verify-user'
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
      content: ':x: Sorry, you can not be verified again now.'
    })
    return
  }

  const shouldBeVerified = await fetch(`https://api.stellar.quest/user/${id}?verified=true`)
    .then(res => res.json())
    .then(user => user.verified)

  if (!shouldBeVerified) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: ':x:Please solve a few more quests and come back later!'
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

