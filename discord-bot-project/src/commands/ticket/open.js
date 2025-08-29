module.exports = {
    name: 'open',
    description: 'Open a new ticket for users to interact with.',
    async execute(interaction) {
        const ticketChannel = await interaction.guild.channels.create(`ticket-${interaction.user.username}`, {
            type: 'GUILD_TEXT',
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: interaction.user.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                },
            ],
        });

        await interaction.reply(`Ticket created: ${ticketChannel}`);
        const embed = {
            color: 0x00ff00, // Green color
            title: 'Ticket Opened',
            description: `Hello ${interaction.user.username}, how can we assist you?`,
            footer: {
                text: 'Please describe your issue or question.',
            },
        };

        await ticketChannel.send({ embeds: [embed] });
    },
};