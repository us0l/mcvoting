const { Client, Intents } = require('discord.js');
const { token } = require('./config/config.json');
const presence = require('./utils/presence');
const ticketCommands = require('./commands/ticket');
const giveawayCommands = require('./commands/giveaway');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    presence(client);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Command handling for ticket system
    if (message.content.startsWith('!ticket')) {
        const args = message.content.split(' ').slice(1);
        const command = args[0];

        switch (command) {
            case 'setup':
                await ticketCommands.setup(message);
                break;
            case 'open':
                await ticketCommands.open(message);
                break;
            case 'close':
                await ticketCommands.close(message);
                break;
            case 'claim':
                await ticketCommands.claim(message);
                break;
            case 'transcript':
                await ticketCommands.transcript(message);
                break;
            case 'log':
                await ticketCommands.log(message);
                break;
            default:
                message.channel.send('Unknown ticket command.');
        }
    }

    // Command handling for giveaways
    if (message.content.startsWith('!giveaway')) {
        const args = message.content.split(' ').slice(1);
        const command = args[0];

        switch (command) {
            case 'start':
                await giveawayCommands.start(message);
                break;
            case 'end':
                await giveawayCommands.end(message);
                break;
            case 'reroll':
                await giveawayCommands.reroll(message);
                break;
            default:
                message.channel.send('Unknown giveaway command.');
        }
    }
});

client.login(token);