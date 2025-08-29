# Discord Bot Project

## Overview
This project is a Discord bot built using JavaScript that features a ticket system and a giveaway system. The bot is designed with a sleek black and green theme, providing an engaging user experience.

## Features

### Ticket System
- **Categories**: The ticket system includes three categories:
  - General
  - Partner
  - Management
- **Commands**:
  - `setup`: Initializes the ticket system by creating necessary channels and roles.
  - `open`: Opens a new ticket for users to interact with.
  - `close`: Closes an existing ticket and archives the conversation.
  - `claim`: Allows staff to claim a ticket for handling.
  - `transcript`: Generates a transcript of the ticket conversation.
  - `log`: Logs ticket activity to a designated channel.

### Giveaway System
- **Commands**:
  - `start`: Starts a new giveaway, allowing users to enter.
  - `end`: Ends an ongoing giveaway and announces the winner.
  - `reroll`: Rerolls a giveaway to select a new winner.

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd discord-bot-project
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To run the bot, use the following command:
```
node src/bot.js
```

## Customization
You can customize the bot's appearance by modifying the settings in `src/config/theme.js`.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.