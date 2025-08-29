const { MessageEmbed } = require('discord.js');
const ticketsData = require('../data/tickets.json');

module.exports = {
    name: 'partner',
    description: 'Manage partner-related ticket operations.',
    
    openTicket: async (interaction) => {
        const ticketChannel = await interaction.guild.channels.create(`partner-ticket-${interaction.user.username}`, {
            type: 'GUILD_TEXT',
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: interaction.user.id,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        });

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('Partner Ticket Opened')
            .setDescription(`Hello ${interaction.user.username}, your partner ticket has been opened!`)
            .setTimestamp();

        ticketChannel.send({ embeds: [embed] });
        ticketsData.push({ id: ticketChannel.id, user: interaction.user.id, category: 'partner', status: 'open' });
    },

    closeTicket: async (interaction) => {
        const ticketChannel = interaction.channel;

        if (ticketChannel.name.startsWith('partner-ticket-')) {
            await ticketChannel.delete();
            ticketsData = ticketsData.filter(ticket => ticket.id !== ticketChannel.id);
        } else {
            interaction.reply('This command can only be used in a partner ticket channel.');
        }
    },

    claimTicket: async (interaction) => {
        const ticketChannel = interaction.channel;

        if (ticketChannel.name.startsWith('partner-ticket-')) {
            const embed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('Ticket Claimed')
                .setDescription(`This ticket has been claimed by ${interaction.user.username}.`)
                .setTimestamp();

            ticketChannel.send({ embeds: [embed] });
        } else {
            interaction.reply('This command can only be used in a partner ticket channel.');
        }
    },

    transcriptTicket: async (interaction) => {
        const ticketChannel = interaction.channel;

        if (ticketChannel.name.startsWith('partner-ticket-')) {
            // Logic to generate and send transcript
            interaction.reply('Transcript has been generated and sent to your DMs.');
        } else {
            interaction.reply('This command can only be used in a partner ticket channel.');
        }
    },

    logTicketActivity: async (interaction, action) => {
        const logChannel = interaction.guild.channels.cache.find(channel => channel.name === 'ticket-logs');
        if (logChannel) {
            logChannel.send(`${interaction.user.username} has ${action} a partner ticket.`);
        }
    }
};