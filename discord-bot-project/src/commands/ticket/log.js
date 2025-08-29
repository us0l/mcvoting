const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ticketsDataPath = path.join(__dirname, '../../data/tickets.json');

const logTicketActivity = (ticketId, action, user) => {
    const ticketsData = JSON.parse(fs.readFileSync(ticketsDataPath, 'utf-8'));
    const ticket = ticketsData[ticketId];

    if (!ticket) return;

    const logChannel = ticket.logChannel; // Assuming logChannel is stored in ticket data
    const embed = new MessageEmbed()
        .setColor('#00ff00') // Green color for the theme
        .setTitle(`Ticket Activity Log`)
        .addField('Ticket ID', ticketId)
        .addField('Action', action)
        .addField('User', user.tag)
        .setTimestamp();

    const channel = ticket.guild.channels.cache.get(logChannel);
    if (channel) {
        channel.send({ embeds: [embed] });
    }
};

module.exports = logTicketActivity;