const { Client, MessageEmbed, Message } = require('discord.js');
const db = require('quick.db');
const { colors, fromIntToDate } = require('discord-toolbox');
const config = require('../../config.json');
const moment = require('moment');
const translate = require('../translate');

/**
 * @param {Client} client 
 * @param {Message} msg
 * @param {string[]} args
 */
const run = async (client, msg, args) => {
    if(msg.author.bot) return;

    let embed = new MessageEmbed()
        .setColor(colors.yellow)
        .setTitle(`📝 - ${translate("Komut listesi", "Commands list")}`)
        .setDescription(client.commands.map(c => `\`\`${c.name}\`\``).join(", "))
        .setFooter(translate(`Sordu: `, `Asked by: `) + (msg.member.nickname || msg.author.username), msg.author.displayAvatarURL())
    msg.channel.send({ embeds: [embed] }).catch(()=>'');
};

module.exports = {
    aliases: ["h", "help", "yardim", "yardım"],
    description: "Mevcut tüm komutları görün",
    run: run
};