const Discord = require("discord.js");
const fetch = require("node-fetch");
const config = require("./config.json");
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] })

client.on("ready", () => {
    console.log(`Connected to: ${client.user.tag}`);
    const guild = client.guilds.cache.get(config.guild_id);
    if (!guild) {
        console.error("Please verify that the bot is invited to your guild and the guildID in the config is correct.");
        return;
    }
    let commands = guild.commands;

    commands.create({
        name: "whitelist",
        description: "Whitelist a player.",
        options: [
            {
                name: "steamid",
                description: "steam64ID",
                required: true,
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING
            }
        ]
    })
})

client.on('interactionCreate', async interaction => {
    if (!interaction.member.roles.cache.some(r => config.admin_roles.includes(r.id))) {
        interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true })
        return;
    }

    if (!interaction.isCommand()) {
        return;
    }
    if (interaction.commandName != "whitelist") {
        return;
    }
    if (!interaction.options.getString("steamid").startsWith("7656119") || interaction.options.getString("steamid").length != 17) {
        return;
    }

    const response = await fetch(`https://api.battlemetrics.com/players/match`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.battlemetrics_api_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(
            {
                "data": [
                    {
                        "type": "identifier",
                        "attributes": {
                            "type": "steamID",
                            "identifier": interaction.options.getString("steamid")
                        }
                    }
                ]
            }
        )
    })
    if (!response.ok) {
        interaction.reply({ content: "An error occured while processing your request.", ephemeral: true });
        return;
    }

    const data = await response.json();
    if (data["data"].length == 0) {
        interaction.reply({ content: "User not found.", ephemeral: true });
        return;
    }

    const bmid = data["data"]["0"]["relationships"]["player"]["data"]["id"];

    const response2 = await fetch(`https://api.battlemetrics.com/players/${bmid}/relationships/flags`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.battlemetrics_api_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(
            {
                "data": [
                    {
                        "type": "playerFlag",
                        "id": config.whitelist_flag_id
                    }
                ]
            }
        )
    })

    if (!response2.ok) {
        const data2 = await response2.json();

        if (data2["errors"]) {
            if (data2["errors"]["0"]["status"] == "409") {
                interaction.reply({ content: "The requested player is already whitelisted.", ephemeral: true });
            }
            else {
                interaction.reply({ content: "An error occured while processing your request.", ephemeral: true });
            }
        }
        return;
    }

    interaction.reply({ content: "The player was whitelisted successfully.", ephemeral: true });
})

client.login(config.token);