const { MessageEmbed } = require('discord.js');
const giveaways = require('../../data/giveaways.json');
const fs = require('fs');

module.exports = {
    name: 'start',
    description: 'Start a new giveaway',
    async execute(message, args) {
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply('Please mention a channel to start the giveaway in.');

        const duration = args[1];
        if (!duration) return message.reply('Please specify a duration for the giveaway.');

        const prize = args.slice(2).join(' ');
        if (!prize) return message.reply('Please specify a prize for the giveaway.');

        const embed = new MessageEmbed()
            .setTitle('🎉 Giveaway! 🎉')
            .setDescription(`Prize: ${prize}\nDuration: ${duration}`)
            .setColor('#00ff00')
            .setTimestamp(Date.now() + ms(duration))
            .setFooter('React with 🎉 to enter!');

        const giveawayMessage = await channel.send(embed);
        await giveawayMessage.react('🎉');

        giveaways.push({
            id: giveawayMessage.id,
            channel: channel.id,
            prize: prize,
            duration: duration,
            ended: false,
        });

        fs.writeFileSync('./src/data/giveaways.json', JSON.stringify(giveaways, null, 2));

        message.channel.send(`Giveaway started in ${channel}!`);
    },
};