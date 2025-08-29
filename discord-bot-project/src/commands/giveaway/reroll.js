const { MessageEmbed } = require('discord.js');
const giveaways = require('../../data/giveaways.json');
const fs = require('fs');

module.exports = {
    name: 'reroll',
    description: 'Reroll a giveaway to select a new winner.',
    async execute(message, args) {
        const giveawayID = args[0];
        const giveaway = giveaways.find(g => g.id === giveawayID);

        if (!giveaway) {
            return message.channel.send('Giveaway not found.');
        }

        if (giveaway.ended) {
            return message.channel.send('This giveaway has already ended.');
        }

        const participants = giveaway.participants;
        if (participants.length === 0) {
            return message.channel.send('There are no participants in this giveaway.');
        }

        const newWinner = participants[Math.floor(Math.random() * participants.length)];

        const embed = new MessageEmbed()
            .setTitle('Giveaway Rerolled!')
            .setDescription(`New winner for **${giveaway.title}**: <@${newWinner}>`)
            .setColor('#00FF00');

        message.channel.send({ embeds: [embed] });

        // Update the giveaway data
        giveaway.winner = newWinner;
        fs.writeFileSync('./src/data/giveaways.json', JSON.stringify(giveaways, null, 2));
    },
};