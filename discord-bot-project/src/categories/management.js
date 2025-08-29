const { MessageEmbed } = require('discord.js');
const ticketsData = require('../data/tickets.json');
const logger = require('../utils/logger');

module.exports = {
    manageTickets: async (interaction) => {
        const { options } = interaction;
        const action = options.getString('action');
        const ticketId = options.getString('ticket_id');

        switch (action) {
            case 'view':
                const ticket = ticketsData[ticketId];
                if (!ticket) {
                    return interaction.reply('Ticket not found.');
                }
                const embed = new MessageEmbed()
                    .setTitle(`Ticket ID: ${ticketId}`)
                    .addField('Status', ticket.status)
                    .addField('User', ticket.user)
                    .setColor('#00FF00');
                return interaction.reply({ embeds: [embed] });

            case 'delete':
                if (!ticketsData[ticketId]) {
                    return interaction.reply('Ticket not found.');
                }
                delete ticketsData[ticketId];
                logger.log(`Ticket ${ticketId} deleted by ${interaction.user.tag}`);
                return interaction.reply(`Ticket ${ticketId} has been deleted.`);

            default:
                return interaction.reply('Invalid action. Please use "view" or "delete".');
        }
    }
};