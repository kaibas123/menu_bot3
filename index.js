require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { addMenu, getMenu } = require("./db");
const { fetchMenu } = require("./menu");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const parts = message.content.trim().split(/\s+/);
    let isTomorrow = parts[0] === "내일메뉴";

    if (parts[0] !== "메뉴" && !isTomorrow && parts[0] !== "메뉴추천") return;

    const restaurant = parts[1];
    const time = parts[2];
    let dateStr = parts[3];
    let dateArr = (dateStr ?? "").split("-");

    const now = new Date();

    now.setFullYear(dateArr[0] ?? now.getFullYear());
    now.setMonth(dateArr[1] ? dataArr[1] - 1 : now.getMonth());
    now.setDate(dateArr[2] ?? now.getDate());

    const koreaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const hour = koreaTime.getHours();
    let nowTime = time ? time : (hour >= 13 && !isTomorrow && !dateStr ? "석식" : "중식");

    koreaTime.setDate(koreaTime.getDate() + Number(isTomorrow));
    let nowDate = koreaTime.toISOString().slice(0, 11);

    try {
        let data = await fetchMenu(dateStr, restaurant, Number(isTomorrow), nowTime);
        let msg = "";

        if (parts[0] === "메뉴추천") {
            let isR5 = restaurant && restaurant === 'r5';
            let data2 = await fetchMenu(dateStr, isR5 ? "r4" : "r5" , Number(isTomorrow), nowTime);

            const allData = Object.assign({}, data.data[time ?? nowTime], data2.data[time ?? nowTime]);

            let rests = Object.keys(allData).filter(v => !(v.includes("T/O") || v.includes("사전신청")));
            let random = ~~(Math.random() * rests.length);
            let recommended = allData[rests[random]];

            recommended.forEach((v, i) => {
                let allCal = v.nutritionData.reduce((acc, v) => acc + v.calorie, 0);

                v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                    let calorie = v.nutritionData.find(val => val.name === va)?.calorie;

                    if (!i) msg += `\n${v.menuCourseName} : ${allCal ? `(kcal: ${allCal})` : ""}\n`;
                    msg += `${` `.repeat(`${v.menuCourseName} : `.length + 3)}${va} ${calorie ? `(kcal: ${calorie})` : ""}\n`;
                });
            });

            const buffer = Buffer.from(msg, "utf-8");

            await message.reply({
                content: (`${dateStr ?? "오늘"} 메뉴 추천 : \n ${Object.keys(data2.data[time ?? nowTime]).find(v => v === rests[random]) ? "r5" : "r4"} ${rests[random]}`),
                files: [{ attachment: buffer, name: `recommend_menu.txt` }]
            });
        } else {
            if (restaurant === "전체") {
                let data2 = await fetchMenu(dateStr, "r5", Number(isTomorrow), nowTime);

                msg += "r4:"
                Object.values(data.data[time ?? nowTime]).forEach(section => {
                    section.forEach(v => {
                        if (v.menuCourseName.includes("T/O") || v.menuCourseName.includes("죽")) return;

                        let allCal = v.nutritionData.reduce((acc, v) => acc + v.calorie, 0);

                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            let calorie = v.nutritionData.find(val => val.name === va)?.calorie;

                            if (!i) msg += `\n${v.menuCourseName} : ${allCal ? `(kcal: ${allCal})` : ""}\n`;
                            msg += `${` `.repeat(`${v.menuCourseName} : `.length + 3)}${va} ${calorie ? `(kcal: ${calorie})` : ""}\n`;
                        });
                    });
                });

                msg += "\nr5:";
                Object.values(data2.data[time ?? nowTime]).forEach(section => {
                    section.forEach(v => {
                        if (v.menuCourseName.includes("T/O") || v.menuCourseName.includes("죽")) return;

                        let allCal = v.nutritionData.reduce((acc, v) => acc + v.calorie, 0);

                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            let calorie = v.nutritionData.find(val => val.name === va)?.calorie;

                            if (!i) msg += `\n${v.menuCourseName} : ${allCal ? `(kcal: ${allCal})` : ""}\n`;
                            msg += `${` `.repeat(`${v.menuCourseName} : `.length + 3)}${va} ${calorie ? `(kcal: ${calorie})` : ""}\n`;
                        });
                    });
                });
            } else if ((restaurant ?? "").toLowerCase() === "to") {
                let data2 = await fetchMenu(dateStr, "r5", Number(isTomorrow), nowTime);

                msg += "r4:"
                Object.values(data.data[time ?? nowTime]).forEach(section => {
                    section.forEach(v => {
                        if (!v.menuCourseName.includes("T/O") && !v.menuCourseName.includes("죽")) return;
                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            if (!i) msg += `\n${v.menuCourseName} : `;
                            msg += `${i ? "\t\t\t " : ""}${va}\n`;
                        });
                    });
                });

                msg += "\nr5:";
                Object.values(data2.data[time ?? nowTime]).forEach(section => {
                    section.forEach(v => {
                        if (!v.menuCourseName.includes("T/O") && !v.menuCourseName.includes("죽")) return;
                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            if (!i) msg += `\n${v.menuCourseName} : `;
                            msg += `${i ? "\t\t\t " : ""}${va}\n`;
                        });
                    });
                });
            } else {
                let datas = Object.values(data.data[time ?? nowTime]);

                datas.forEach(section => {
                    section.forEach(v => {
                        if (v.menuCourseName.includes("T/O") || v.menuCourseName.includes("죽")) return;

                        let allCal = v.nutritionData.reduce((acc, v) => acc + v.calorie, 0);

                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            let calorie = v.nutritionData.find(val => val.name === va)?.calorie;

                            if (!i) msg += `\n${v.menuCourseName} : ${allCal ? `(kcal: ${allCal})` : ""}\n`;
                            msg += `${` `.repeat(`${v.menuCourseName} : `.length + 3)}${va} ${calorie ? `(kcal: ${calorie})` : ""}\n`;
                        });
                    });
                });

                datas.forEach(section => {
                    section.forEach(v => {
                        if (!v.menuCourseName.includes("T/O") && !v.menuCourseName.includes("죽")) return;

                        v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                            if (!i) msg += `\n${v.menuCourseName} :`;
                            msg += `${i ? "\t\t\t " : ""}${va}\n`;
                        });
                    });
                });
            }

            const buffer = Buffer.from(msg, "utf-8");

            await message.reply({
                content: (dateStr ? `${dateStr} ${nowTime} 메뉴` : `${isTomorrow ? "내일" : "오늘"} ${nowTime}${(restaurant ?? "").toLowerCase() === "to" ? " T/O" : ""} 메뉴`),
                files: [{ attachment: buffer, name: `${time ?? nowTime}_menu.txt` }]
            });
        }
    } catch (e) {
        await message.reply(`불러오기 실패: 시간이나 식당이 잘못되었거나 해당 날짜 ${(time ?? nowTime).toUpperCase()}에 식사가 없습니다.`);
    }
});

client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);