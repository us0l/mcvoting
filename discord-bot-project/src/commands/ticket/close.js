module.exports = {
    name: 'close',
    description: 'Closes an existing ticket and archives the conversation.',
    async execute(interaction) {
        const ticketChannel = interaction.channel;

        if (!ticketChannel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Archive the ticket (you can implement your own archiving logic)
        await ticketChannel.send('This ticket has been closed. Thank you for using our support system!');
        
        // Close the ticket channel
        await ticketChannel.delete();
    },
};