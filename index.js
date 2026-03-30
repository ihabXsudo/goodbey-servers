// ============================================
// DISCORD BOT - EDUCATIONAL EXAMPLE
// ============================================
// This bot demonstrates channel creation, deletion,
// and message sending with safety limits
//
// TO INSTALL:
// 1. Open terminal in this folder
// 2. Run: npm init -y
// 3. Run: npm install discord.js
// 4. Replace 'YOUR_BOT_TOKEN_HERE' with your actual bot token
// 5. Run: node index.js
// ============================================

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

// Create bot client with required permissions
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// SAFETY LIMITS - Change these for testing
const SAFE_LIMITS = {
    MAX_CHANNELS: 500,      // SAFE: Only 5 channels (not 500)
    MAX_MESSAGES: 100,      // SAFE: Only 3 messages (not 100)
    DELAY_MS: 700        // 1 second delay between operations
};

// Your bot token (REPLACE THIS WITH YOUR ACTUAL TOKEN)
const TOKEN = '';

// Store channel IDs we create so we can clean up
let createdChannels = [];

// ============================================
// FUNCTION: Delete all channels in the server
// ============================================
async function deleteAllChannels(guild) {
    console.log(`📝 Starting to delete channels in: ${guild.name}`);
    
    // Get all text channels
    const channels = guild.channels.cache.filter(channel => channel.type === 0); // Type 0 = text channel
    
    console.log(`Found ${channels.size} text channels to delete`);
    
    for (const channel of channels.values()) {
        try {
            await channel.delete();
            console.log(`✅ Deleted channel: ${channel.name}`);
            // Wait a bit to avoid rate limiting
            await wait(SAFE_LIMITS.DELAY_MS);
        } catch (error) {
            console.error(`❌ Failed to delete ${channel.name}:`, error.message);
        }
    }
}

// ============================================
// FUNCTION: Create multiple channels
// ============================================
async function createChannels(guild, count) {
    console.log(`📝 Creating ${count} channels...`);
    const channels = [];
    
    for (let i = 1; i <= count; i++) {
        try {
            const channel = await guild.channels.create({
                name: `test-channel-${i}`,
                type: 0, // Text channel
                reason: "Educational bot demo"
            });
            
            channels.push(channel);
            createdChannels.push(channel.id);
            console.log(`✅ Created channel ${i}/${count}: ${channel.name}`);
            
            // Wait to avoid rate limiting
            await wait(SAFE_LIMITS.DELAY_MS);
        } catch (error) {
            console.error(`❌ Failed to create channel ${i}:`, error.message);
        }
    }
    
    return channels;
}

// ============================================
// FUNCTION: Send repeated messages to a channel
// ============================================
async function sendRepeatedMessages(channel, message, count) {
    console.log(`📝 Sending ${count} messages to ${channel.name}`);
    
    for (let i = 1; i <= count; i++) {
        try {
            await channel.send(`${message} (Message ${i}/${count})`);
            console.log(`test 1 ${i}/${count} to ${channel.name}`);
            
            // Wait between messages to avoid rate limiting
            await wait(SAFE_LIMITS.DELAY_MS);
        } catch (error) {
            console.error(`❌ Failed to send message to ${channel.name}:`, error.message);
            break; // Stop if we can't send anymore
        }
    }
}

// ============================================
// HELPER: Wait function (delay)
// ============================================
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN COMMAND: /test
// ============================================
async function executeTestCommand(interaction) {
    // Safety confirmation
    await interaction.reply({
        content: `⚠️ **WARNING: Educational Demo Mode** ⚠️\n\n` +
                `This will:\n` +
                `• Delete ALL text channels in this server\n` +
                `• Create ${SAFE_LIMITS.MAX_CHANNELS} new channels\n` +
                `• Send ${SAFE_LIMITS.MAX_MESSAGES} messages to each channel\n` +
                `\n**Total operations:** ${SAFE_LIMITS.MAX_CHANNELS * SAFE_LIMITS.MAX_MESSAGES} messages\n` +
                `\nThis is a SAFE version for learning purposes.\n` +
                `Type **CONFIRM** to continue (case-sensitive)`,
        ephemeral: true // Only visible to you
    });
    
    // Wait for user confirmation
    const filter = (response) => {
        return response.author.id === interaction.user.id && response.content === 'CONFIRM';
    };
    
    try {
        const confirmation = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 15000,
            errors: ['time']
        });
        
        if (confirmation.first().content === 'CONFIRM') {
            await interaction.followUp({ content: "🚀 Starting test sequence...", ephemeral: true });
            
            // Step 1: Delete all existing channels
            await deleteAllChannels(interaction.guild);
            await wait(2000);
            
            // Step 2: Create new channels
            const newChannels = await createChannels(interaction.guild, SAFE_LIMITS.MAX_CHANNELS);
            await wait(2000);
            
            // Step 3: Send messages to each channel
            for (const channel of newChannels) {
                await sendRepeatedMessages(channel, "testingggg!", SAFE_LIMITS.MAX_MESSAGES);
                await wait(700);
            }
            
            await interaction.followUp({ 
                content: `✅ Test completed!\n` +
                        `Created ${SAFE_LIMITS.MAX_CHANNELS} channels\n` +
                        `Sent ${SAFE_LIMITS.MAX_CHANNELS * SAFE_LIMITS.MAX_MESSAGES} total messages\n` +
                        `\nUse \`/cleanup\` to delete test channels.`,
                ephemeral: true 
            });
        }
    } catch (error) {
        await interaction.followUp({ content: "❌ Test cancelled (timeout or invalid confirmation)", ephemeral: true });
    }
}

// ============================================
// CLEANUP COMMAND: /cleanup
// ============================================
async function executeCleanupCommand(interaction) {
    await interaction.reply({ content: "🧹 Cleaning up test channels...", ephemeral: true });
    
    let deleted = 0;
    for (const channelId of createdChannels) {
        try {
            const channel = await interaction.guild.channels.fetch(channelId);
            if (channel) {
                await channel.delete();
                deleted++;
                await wait(500);
            }
        } catch (error) {
            console.error(`Failed to delete channel ${channelId}:`, error.message);
        }
    }
    
    createdChannels = [];
    await interaction.followUp({ content: `✅ Cleaned up ${deleted} test channels!`, ephemeral: true });
}

// ============================================
// BOT SETUP AND SLASH COMMANDS
// ============================================
const commands = [
    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Run the educational test (deletes all channels, creates new ones, sends messages)'),
    new SlashCommandBuilder()
        .setName('cleanup')
        .setDescription('Delete all test channels created by this bot')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    // Register slash commands
    try {
        console.log('📝 Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'test') {
        await executeTestCommand(interaction);
    } else if (interaction.commandName === 'cleanup') {
        await executeCleanupCommand(interaction);
    }
});

// Login to Discord
client.login(TOKEN);
