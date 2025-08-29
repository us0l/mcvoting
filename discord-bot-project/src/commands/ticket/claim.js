module.exports = {
    name: 'claim',
    description: 'Claim a ticket for handling',
    async execute(interaction) {
        const ticketChannel = interaction.channel;
        const ticketData = require('../../data/tickets.json');

        // Check if the channel is a ticket channel
        if (!ticketData[ticketChannel.id]) {
            return interaction.reply({ content: 'This is not a valid ticket channel.', ephemeral: true });
        }

        // Check if the ticket is already claimed
        if (ticketData[ticketChannel.id].claimed) {
            return interaction.reply({ content: 'This ticket has already been claimed.', ephemeral: true });
        }

        // Claim the ticket
        ticketData[ticketChannel.id].claimed = true;
        ticketData[ticketChannel.id].claimedBy = interaction.user.id;

        // Save the updated ticket data
        const fs = require('fs');
        fs.writeFileSync('./src/data/tickets.json', JSON.stringify(ticketData, null, 2));

        return interaction.reply({ content: `Ticket claimed by ${interaction.user.username}.`, ephemeral: true });
    }
};