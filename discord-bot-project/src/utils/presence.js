const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

function setPresence() {
    client.user.setPresence({
        activities: [{ name: 'Assisting with tickets and giveaways!', type: 'WATCHING' }],
        status: 'online',
    });
}

module.exports = setPresence;