require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const { addMenu, getMenu } = require("./db");
const { fetchMenu } = require("./menu");
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

async function fetchImageBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });

    return Buffer.from(res.data);
}

async function mergeImagesWithTitles(items) {
    const padding = 20;
    const gap = 20;
    const titleHeight = 50;

    const cols = items.reduce((acc, v) => acc = acc < v.length ? v.length : acc, 0);
    const imageWidth = 300;
    const imageHeight = 300;

    const loaded = [];

    let i = -1;
    for (const item of items) {
        i++;
        loaded[i] = [];

        for (const it of item) {
            try {
                console.log('[다운로드 시도]', it.path);

                const buffer = await fetchImageBuffer(it.path);
                const image = await loadImage(buffer);

                loaded[i].push({
                    title: it.title || '제목 없음',
                    image
                });

                console.log('[로드 성공]', it.path, image.width, image.height);
            } catch (err) {
                console.error('[로드 실패]', it.path, err.message);
            }
        }
    }

    if (!loaded.length) {
        throw new Error('사용 가능한 이미지를 하나도 불러오지 못했습니다.');
    }

    const rows = loaded.length;

    const canvasWidth =
        padding * 2 +
        cols * imageWidth +
        (cols - 1) * gap;

    const canvasHeight =
        padding * 2 +
        rows * (titleHeight + imageHeight) +
        (rows - 1) * gap;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let row = 0; row < loaded.length; row++) {
        for (let col = 0; col < loaded[row].length; col++) {
            const { title, image } = loaded[row][col];

            const x = padding + col * (imageWidth + gap);
            const y = padding + row * (titleHeight + imageHeight + gap);

            // 제목 배경
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(x, y, imageWidth, titleHeight);

            // 제목 텍스트
            ctx.fillStyle = '#111111';
            ctx.font = 'bold 32px Sans';
            ctx.textBaseline = 'middle';
            ctx.fillText(title, x + 12, y + titleHeight / 2);

            // cover 방식으로 이미지 꽉 채우기
            const ratio = Math.max(
                imageWidth / image.width,
                imageHeight / image.height
            );

            const drawWidth = image.width * ratio;
            const drawHeight = image.height * ratio;

            const drawX = x + (imageWidth - drawWidth) / 2;
            const drawY = y + titleHeight + (imageHeight - drawHeight) / 2;

            // 이미지 영역 clip
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y + titleHeight, imageWidth, imageHeight);
            ctx.clip();

            ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();

            // 테두리
            ctx.strokeStyle = '#dddddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y + titleHeight, imageWidth, imageHeight);
        }
    }

    return canvas.toBuffer('image/png');
}

async function getTakeIn(arr) {
    let images = [];
    let msg = "";

    Object.values(arr).forEach(section => {
        section.forEach(v => {
            if (v.menuCourseName.includes("T/O") || v.menuCourseName.includes("죽")) return;

            if (v.image) {
                images.push({
                    "title": v.menuCourseName,
                    "path": v.image.includes("planeat") ? v.image.replace("http://planeatchoice.net", "https://welplan.pmh.codes/img/planeat") : v.image.replace("http://samsungwelstory.com", "https://welplan.pmh.codes/img/welstory")
                });
            }

            let allCal = v.nutritionData.reduce((acc, v) => acc + v.calorie, 0);

            v.subMenuTxt.split(/,\s|,/).forEach((va, i) => {
                let calorie = v.nutritionData.find(val => val.name === va)?.calorie;

                if (!i) msg += `\n${v.menuCourseName} : ${allCal ? `(kcal: ${allCal})` : ""}\n`;
                msg += `${` `.repeat(`${v.menuCourseName} : `.length + 3)}${va} ${calorie ? `(kcal: ${calorie})` : ""}\n`;
            });
        });
    });

    return [msg, images];
}

async function getTakeOut(arr) {
    let msg = "";

    Object.values(arr).forEach(section => {
        section.forEach(v => {
            v.subMenuTxt.split(/\|\|\s|\|\|/).forEach((va, i) => {
                if (!i) msg += `\n${v.menuCourseName} : \n`;
                msg += `${"\t\t\t "}${va}\n`;
            });
        });
    });

    return msg;
}

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
        let takeOutData = await fetchMenu(dateStr, "to", Number(isTomorrow), nowTime);
        let msg = "";
        let images = [];

        if (parts[0] === "메뉴추천") {
            let isR5 = restaurant && restaurant === 'r5';

            const allData = Object.assign({}, data.data["r4"][time ?? nowTime], data.data["r5"][time ?? nowTime], data.data["f"][time ?? nowTime]);

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
                let ti = await getTakeIn(data.data["r4"][time ?? nowTime]);

                msg += "r4:"
                msg += ti[0];
                images.push(ti[1]);

                ti = await getTakeIn(data.data["r5"][time ?? nowTime]);
                msg += "\nr5:";
                msg += ti[0];
                images.push(ti[1]);

                ti = await getTakeIn(data.data["f"][time ?? nowTime]);
                msg += "\nf:";
                msg += ti[0];
                images.push(ti[1]);
            } else if ((restaurant ?? "").toLowerCase() === "to") {
                msg += "r4:"
                msg += await getTakeOut(takeOutData.data["r4"][time ?? nowTime]);

                msg += "\nr5:";
                msg += await getTakeOut(takeOutData.data["r5"][time ?? nowTime]);
            } else {
                let ti = await getTakeIn(data.data[parts[1] ?? "r4"][time ?? nowTime]);

                images.push(ti[1]);
                msg += ti[0];

                if ((restaurant ?? "").toLowerCase() !== "f") {
                    msg += await getTakeOut(takeOutData.data[parts[1] ?? "r4"][time ?? nowTime]);
                }
            }

            const buffer = Buffer.from(msg, "utf-8");

            await message.reply({
                content: (dateStr ? `${dateStr} ${nowTime} 메뉴` : `${isTomorrow ? "내일" : "오늘"} ${nowTime}${(restaurant ?? "").toLowerCase() === "to" ? " T/O" : ""} 메뉴`),
                files: [{ attachment: buffer, name: `${time ?? nowTime}_menu.txt` }]
            });

            if (images.length) {
                let channel = message.channel;
                try {
                    let buf = await mergeImagesWithTitles(images);
                    let attachment = new AttachmentBuilder(buf, { name: 'menus.png' });
                    await channel.send({ files: [attachment] });
                } catch (err) {
                    console.error('이미지 생성/전송 실패:', err);
                    await channel.send(`이미지 생성 실패: ${err.message}`);
                }
            }
        }
    } catch (e) {
        await message.reply(`불러오기 실패: 시간이나 식당이 잘못되었거나 해당 날짜 ${(time ?? nowTime).toUpperCase()}에 식사가 없습니다.`);
    }
});

client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);