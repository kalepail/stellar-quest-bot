const { Client, ApplicationCommandType, ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require('discord.js')

module.exports.commandName = 'post'

const {
  FORUM_CHANNEL_HELP,
  LUMENAUT_ROLE_ID,
  HELP_TAG_BUG,
  HELP_TAG_DUPLICATE,
  HELP_TAG_FLAGGED,
  HELP_TAG_NEW,
  HELP_TAG_OPEN,
  HELP_TAG_SOLVED
} = process.env

module.exports.setup = async function setupForum(client) {
  client.on('messageCreate', handleMessage)
    .on('threadCreate', handlePost)
    .on('interactionCreate', interaction => {
      if (interaction.commandName == module.exports.commandName)
        handleInteraction(interaction).catch(console.error)
    })

  const commands = await client.application.commands.fetch()
  const command = commands.find(cmd => cmd.name == module.exports.commandName)
  if (!command) {
    await client.application.commands.create({
      defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
      name: module.exports.commandName,
      description: 'Different actions for forum threads',
      type: ApplicationCommandType.ChatInput,
      dm_permission: false,
      options: [{
        type: ApplicationCommandOptionType.Subcommand,
        name: 'solve',
        description: 'Tag this post as solved'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'close',
        description: 'Tag this post as solved and close it'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'lock',
        description: 'Lock and tag the post as solved. Note: only Lumenary+ will be able to reopen it.'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'duplicate',
        description: 'Toggle the posts duplicated tag.'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'bug',
        description: 'Toggle the solved tag.'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'flag',
        description: 'Toggle the flagged tag.'
      }, {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'open',
        description: 'Tag this post as open and remove the solved tag is set.'
      }]
    })
  }

}

/**
 * Removes the open tag, when a lumenaut answered within a post.
 */
async function handleMessage(message) {
  const channel = message.channel
  if (!channel.isThread
    || channel.parentId != FORUM_CHANNEL_HELP)
    return
  if (message.member?.roles?.cache.has(LUMENAUT_ROLE_ID)
    && channel.appliedTags.includes(HELP_TAG_NEW)) {
    const tags = channel.appliedTags
    removeTag(tags, HELP_TAG_NEW)
    ensureTag(tags, HELP_TAG_OPEN)
    await channel.setAppliedTags(
      tags,
      'Lumenaut answered post.'
    )
  }
}


const toggle = (tags, tag) => {
  let idx;
  if ((idx = tags.indexOf(tag)) >= 0)
    tags.splice(idx, 1)
  else
    tags.push(tag)
}

const ensureTag = (tags, tag) => {
  if (!tags.includes(tag))
    tags.push(tag)
}

const removeTag = (tags, tag) => {
  let idx;
  if ((idx = tags.indexOf(tag)) >= 0)
    tags.splice(idx, 1)
}

async function handleInteraction(interaction) {
  if (!interaction.channel.isThread
    || interaction.channel.parentId != process.env.FORUM_CHANNEL_HELP) {
    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: ':x: Invalid Channel'
    })
  }

  const actor = interaction.member.user.tag
  const tags = interaction.channel.appliedTags

  // we need to reply before doing anything
  // otherwise we'd reopen the post by writing to it ...
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: ':white_check_mark: Processing.'
  })
  switch (interaction.options.getSubcommand(true)) {
    case 'close':
      removeTag(tags, HELP_TAG_OPEN)
      ensureTag(tags, HELP_TAG_SOLVED)
      await interaction.channel.setAppliedTags(tags, `Closed by ${actor}`)
      await interaction.channel.setArchived(true)
      break
    case 'solve':
      removeTag(tags, HELP_TAG_OPEN)
      toggle(tags, HELP_TAG_SOLVED)
      await interaction.channel.setAppliedTags(tags, `Solved tag toggled by ${actor}`)
      break
    case 'lock':
      removeTag(tags, HELP_TAG_OPEN)
      ensureTag(tags, HELP_TAG_SOLVED)
      await interaction.channel.setAppliedTags(tags, `Locked by ${actor}`)
      await interaction.channel.setLocked(true)
      await interaction.channel.setArchived(true)
      break
    case 'duplicate':
      toggle(tags, HELP_TAG_DUPLICATE)
      await interaction.channel.setAppliedTags(tags, `Duplicate tag toggled by ${actor}`)
      break
    case 'bug':
      toggle(tags, HELP_TAG_BUG)
      await interaction.channel.setAppliedTags(tags, `Bug tag toggled by ${actor}`)
      break
    case 'flag':
      toggle(tags, HELP_TAG_FLAGGED)
      await interaction.channel.setAppliedTags(tags, `Flagged tag toggled by ${actor}`)
      break
    case 'open':
      removeTag(tags, HELP_TAG_SOLVED)
      ensureTag(tags, HELP_TAG_OPEN)
      await interaction.channel.setAppliedTags(tags, `Post opened by ${actor}`)
      break
  }
}

/**
 * Sets the new tag to a new forum post
 */
async function handlePost(thread) {
  if (thread.parentId != FORUM_CHANNEL_HELP
    || thread.appliedTags.length)
    return
  await thread.setAppliedTags([HELP_TAG_NEW], 'Help post created.')
}