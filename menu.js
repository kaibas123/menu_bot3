async function fetchMenu(dateStr, rest, tom, nowTime) {
    const url = new URL(process.env.API_URL);
    if (dateStr) url.searchParams.set("date", dateStr);
    if (rest) url.searchParams.set("restaurant", rest);
    if (tom) url.searchParams.set("tomorrow", tom);
    if (nowTime) url.searchParams.set("nowTime", nowTime);

    const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://menu-api.rf.gd/",
            "Cache-Control": "no-cache",
            ...(process.env.API_KEY ? { "X-API-KEY": process.env.API_KEY } : {}),
        },
    });

    const text = await res.text();

    if (text.trim().startsWith("<")) {
        throw new Error(`HTML 챌린지/차단 응답 받음. head=${text.slice(0, 120)}`);
    }

    return JSON.parse(text);
}

module.exports = {
    fetchMenu,
};