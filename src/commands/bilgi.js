const { Client, MessageEmbed, Message, User, MessageButton, MessageActionRow } = require('discord.js');
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
    try {
        if(!msg.member.permissions.has("MANAGE_GUILD")) return client.sendError(msg, translate("Bu komutu kullanma izniniz yok...", "You do not have permissions to use this command."));
        let member = args[0] ? msg.mentions.members.first() || msg.guild.members.cache.get(args[0]) : msg.member;
        if(!member || member.user.bot) return client.sendError(msg, translate("Üye bulunamadı..", "No members were found..."));
    
        if(!db.has(`users.${member.user.id}`)) {
            db.set(`users.${member.user.id}`, {
                id: member.user.id,
                joins: [{
                    at: member.joinedAt.setHours(member.joinedAt.getHours() +1),
                    by: undefined,
                    inviteCode: undefined
                }],
                bonusHistory: [],
                invites: {
                    normal: 0,
                    left: 0,
                    fake: 0,
                    bonus: 0
                }
            })
        }; let user = db.get(`users.${member.user.id}`);
    
        let regularInvites = ` **${Object.values(user.invites).reduce((x,y)=>x+y)}** ${translate("davetiniz var", "invites")}.\n\n` +
            `✅ \`\`${user.invites.normal}\`\` **${translate("davet edildi", "Invited")}**\n` +
            `❌ \`\`${Math.abs(user.invites.left)}\`\` **${translate("Cikanlar", "Left")}**\n` +
            `💩 \`\`${Math.abs(user.invites.fake)}\`\` **${translate("Geçersiz", "Invalid")}**\n` +
            `✨ \`\`${user.invites.bonus}\`\` **Bonus**`;
    
        let rank = Object.values(db.get("users"))
            .sort((a,b) => Object.values(b.invites).reduce((x,y)=>x+y) - Object.values(a.invites).reduce((x,y)=>x+y))
        
        let embed = new MessageEmbed()
            .setColor(colors.yellow)
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ format: "png" }) })
            .addField(
                translate("__Tarafından davet edildi__", "__Invited by__"),
                user.joins.length ? user.joins[user.joins.length-1].by == "vanity" ? "Özel URL" : user.joins[user.joins.length-1].by ? (client.users.cache.get(user.joins[user.joins.length-1].by) || await client.users.fetch(user.joins[user.joins.length-1].by)).toString() : translate("❌ **bulunamadı**", "❌ **Not found**") : translate("❌ **bulunamadı**", "❌ **Not found**"),
                true
            ).addField("\u200b", "\u200b", true)
            .addField(
                translate("__Katıldı__", "__Joined on__"),
                moment.utc(member.joinedAt.setHours(member.joinedAt.getHours() +2)).format("DD/MM/YYYY à HH:mm:ss") + "\n" +
                translate(`Once **${fromIntToDate(Date.now() - member.joinedTimestamp, "tr")}**`, `**${fromIntToDate(Date.now() - member.joinedTimestamp, "en")}** ago`),
                true
            ).addField(
                translate("__Normal davetler__", "__Regular invites__"),
                regularInvites
            ).addField(
                translate("__Etkin davetler__", "__Active invites__"),
                Array.from(await msg.guild.invites.fetch())
                .map(i => i[1])
                .filter(i => i.inviter.id == member.user.id)
                .sort((a,b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, 10)
                .map(i => {
                    return `**${i.code}** - ${i.channel.toString()} - ${translate(`Once **${fromIntToDate(Date.now() - i.createdTimestamp, "tr")}**`, `**${fromIntToDate(Date.now() - i.createdTimestamp, "en")}** ago`)}`
                }).join("\n") || translate("❌ **Hiçbiri**", "❌ **Any**")
            ).addField(
                translate("__Son davet edilen üyeler__", "__Last invited members__"),
                Array.from(msg.guild.members.cache)
                .map(i => i[1])
                .filter(m => db.has(`users.${m.user.id}`) && db.get(`users.${m.user.id}`).joins.length && db.get(`users.${m.user.id}`).joins[db.get(`users.${m.user.id}`).joins.length-1].by == member.user.id)
                .sort((a,b) => b.joinedTimestamp - a.joinedTimestamp)
                .slice(0, 10)
                .map(m => {
                    let u = db.get(`users.${m.user.id}`);
                    return `${m.user.toString()} - **${u.joins[u.joins.length-1].inviteCode}** - ${translate(`Once **${fromIntToDate(Date.now() - (u.joins[u.joins.length-1].at -7200000))}**`, `**${fromIntToDate(Date.now() - (u.joins[u.joins.length-1].at -7200000))}** ago`)}`
                }).join("\n") || translate("❌ **Hiçbiri**", "❌ **Any**")
            ).setFooter(`${translate("tarafından soruldu", "Asked by")}: ${msg.author.tag}`, msg.author.displayAvatarURL({ format: "png" }))
    
        let invitedHistoryButton = new MessageButton()
            .setCustomId(`invited-history_${member.user.id}_${msg.author.id}`)
            .setStyle("SECONDARY")
            .setLabel(translate("Davet edilen üyelerin geçmişini görüntüleyin", "View invited members history"))
    
        let invitesHistoryButton = new MessageButton()
            .setCustomId(`invites-list_${member.user.id}_${msg.author.id}`)
            .setStyle("SECONDARY")
            .setLabel(translate("Etkin davet geçmişini görüntüleyin", "View active invites history"))
    
        let bonusHistoryButton = new MessageButton()
            .setCustomId(`bonus-history_${member.user.id}_${msg.author.id}`)
            .setStyle("SECONDARY")
            .setLabel(translate("Bonus davet geçmişini görüntüleyin", "View bonus invites history"))
        
        let invitedHistoryActionRaw = new MessageActionRow()
            .addComponents([invitedHistoryButton, invitesHistoryButton, bonusHistoryButton])
        msg.channel.send({ embeds: [embed], components: [invitedHistoryActionRaw] });
    } catch (err) {
        console.error(err);
    }
};

module.exports = {
    aliases: ["infos"],
    description: translate("Bir üyenin davet etkinliği hakkında kesin bilgi almanızı sağlar", "Allows you to obtain precise information on the invitation activity of a member"),
    run: run
};