const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'setup',
    description: 'Sets up the ticket system with necessary channels and roles.',
    async execute(interaction) {
        const guild = interaction.guild;

        // Create roles
        const ticketRole = await guild.roles.create({
            name: 'Ticket Support',
            color: 'GREEN',
            reason: 'Role for ticket support staff',
        });

        // Create ticket categories
        const generalCategory = await guild.channels.create('General Tickets', {
            type: 'GUILD_CATEGORY',
        });

        const partnerCategory = await guild.channels.create('Partner Tickets', {
            type: 'GUILD_CATEGORY',
        });

        const managementCategory = await guild.channels.create('Management Tickets', {
            type: 'GUILD_CATEGORY',
        });

        // Create ticket channels
        await guild.channels.create('general-ticket', {
            type: 'GUILD_TEXT',
            parent: generalCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: ticketRole.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                },
            ],
        });

        await guild.channels.create('partner-ticket', {
            type: 'GUILD_TEXT',
            parent: partnerCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: ticketRole.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                },
            ],
        });

        await guild.channels.create('management-ticket', {
            type: 'GUILD_TEXT',
            parent: managementCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: ticketRole.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                },
            ],
        });

        // Send confirmation message
        const embed = new MessageEmbed()
            .setColor('GREEN')
            .setTitle('Ticket System Setup Complete')
            .setDescription('The ticket system has been successfully set up with roles and channels.');

        await interaction.reply({ embeds: [embed] });
    },
};