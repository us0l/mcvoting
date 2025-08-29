module.exports = async (ticketId, interaction) => {
    const ticketData = require('../../data/tickets.json');
    const ticket = ticketData[ticketId];

    if (!ticket) {
        return interaction.reply('Ticket not found.');
    }

    const transcript = `
        **Ticket ID:** ${ticketId}
        **User:** ${ticket.user}
        **Status:** ${ticket.status}
        **Messages:**
        ${ticket.messages.map(msg => `${msg.author}: ${msg.content}`).join('\n')}
    `;

    // Send the transcript to the user or a designated channel
    await interaction.user.send(transcript).catch(err => {
        console.error('Could not send transcript:', err);
        interaction.reply('Could not send the transcript. Please check your DMs.');
    });

    interaction.reply('Transcript has been sent to your DMs.');
};