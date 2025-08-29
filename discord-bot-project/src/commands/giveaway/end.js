const { MessageEmbed } = require('discord.js');
const giveaways = require('../../data/giveaways.json');
const fs = require('fs');

module.exports = {
    name: 'end',
    description: 'Ends an ongoing giveaway and announces the winner.',
    async execute(message, args) {
        const giveawayId = args[0];
        const giveaway = giveaways.find(g => g.id === giveawayId);

        if (!giveaway) {
            return message.channel.send('Giveaway not found.');
        }

        const winnerCount = giveaway.winnerCount || 1;
        const winners = [];

        for (let i = 0; i < winnerCount; i++) {
            const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
            if (winner && !winners.includes(winner)) {
                winners.push(winner);
            }
        }

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('Giveaway Ended!')
            .addField('Winner(s)', winners.length > 0 ? winners.join(', ') : 'No winners, no participants.');

        message.channel.send(embed);

        // Remove the giveaway from the data
        const updatedGiveaways = giveaways.filter(g => g.id !== giveawayId);
        fs.writeFileSync('./src/data/giveaways.json', JSON.stringify(updatedGiveaways, null, 2));
    },
};