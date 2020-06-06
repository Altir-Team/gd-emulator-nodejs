"use strict";
let express = require("express"),
	router = express.Router(),
	{ exploitPatch, GJPCheck, Utils, web, checkKeys } = require("../utils"),
	{ remove } = exploitPatch,
	fetch = require("node-fetch");
router.post("/getGJSongInfo(.php)?", web.gdMiddleware, (req, res) => {
	if (!checkKeys(req.body, ['songID'])) return res.send('-1');
	let vars = req.body;
	if (!vars.songID.length) return res.send("-1");
	let songID = remove(vars.songID),
		songs = global.database.prepare("SELECT * FROM songs WHERE ID = ?").all(songID),
		songString = (id, name, aid, aname, ssize, dl) => `1~|~${id}~|~2~|~${name}~|~3~|~${aid}~|~4~|~${aname}~|~5~|~${ssize}~|~6~|~~|~10~|~${dl}~|~7~|~`;
	if (!songs.length) return new Promise((resolve) => {
		fetch(`https://www.newgrounds.com/audio/listen/${songID}`).then(x => x.text()).then(x => {
			const songName = x.match(/<title>(.*)<\/title>/)[1];
			if (songName == "Whoops, that's a swing and a miss!") return resolve(res.send("-1"));
			let downloadLink = x.match(/(?:\w+:)?\/\/[^/]+([^?#]+)/g).filter(c => c.includes("audio.ngfiles.com"))[0],
				author = x.match(/"artist":"(.*?)"/g)[0].slice(10, -1);
			downloadLink = downloadLink.slice(67).replace(/\\/g, "");
			fetch(downloadLink).then(c => {
				let size = (c.headers.get("Content-Length") / 1048576).toFixed(2);
				global.database.prepare("INSERT INTO songs (ID, name, authorID, authorName, size, download, isDisabled, addedBy) VALUES (?, ?, ?, ?, ?, ?, ?)").run(songID, songName, "1", author, size, downloadLink, "0", -1);
				return resolve(res.send(songString(songID, songName, "1", author, size, downloadLink)));
			});
		});
	});
	let song = songs[0];
	if (song.isDisabled == "1") return res.send("-2");
	let dlLink = song.download;
	if (dlLink.indexOf(":") !== "-1") dlLink = encodeURIComponent(dlLink);
	return res.send(songString(songID, song.name, song.authorID, song.authorName, song.size, song.download));
});

router.post("/updateGJUserScore(22)?(.php)?", web.gdMiddleware, (req, res) => {
	if (!checkKeys(req.body, ['gameVersion', 'binaryVersion', 'gdw', 'accountID', 'gjp', 'userName', 'stars', 'demons', 'diamonds', 'icon', 'color1', 'color2', 'iconType', 'coins', 'userCoins', 'special', 'accIcon', 'accShip', 'accBall', 'accBird', 'accDart', 'accRobot', 'accGlow', 'accSpider', 'accExplosion', 'seed', 'seed2'])) return res.send('-1');
	let vars = req.body,
		gameVersion = (vars.gameVersion && vars.gameVersion.length) ? remove(vars.gameVersion[0]) : 1,
		coins = (vars.coins && vars.coins.length) ? remove(vars.coins) : 0;
	if (!vars.userName || !vars.secret || !vars.stars || !vars.demons || !vars.icon || !vars.color1 || !vars.color2) return res.send("-1");
	let username = remove(vars.userName),
		secret = remove(vars.secret),
		stars = remove(vars.stars),
		demons = remove(vars.demons),
		icon = remove(vars.icon),
		color1 = remove(vars.color1),
		color2 = remove(vars.color2),
		iconType = (vars.iconType && vars.iconType.length) ? remove(vars.iconType) : 0,
		userCoins = (vars.userCoins && vars.userCoins) ? remove(vars.userCoins) : 0,
		special = (vars.special && vars.special.length) ? remove(vars.special) : 0,
		accIcon = (vars.accIcon && vars.accIcon.length) ? remove(vars.accIcon) : 0,
		accShip = (vars.accShip && vars.accShip.length) ? remove(vars.accShip) : 0,
		accBall = (vars.accBall && vars.accBall.length) ? remove(vars.accBall) : 0,
		accBird = (vars.accBird && vars.accBird.length) ? remove(vars.accBird) : 0,
		accDart = (vars.accDart && vars.accDart.length) ? remove(vars.accDart) : 0,
		accRobot = (vars.accRobot && vars.accRobot.length) ? remove(vars.accRobot) : 0,
		accGlow = (vars.accGlow && vars.accGlow.length) ? remove(vars.accGlow) : 0,
		accSpider = (vars.accSpider && vars.accSpider.length) ? remove(vars.accSpider) : 0,
		accExplosion = (vars.accExplosion && vars.accExplosion.length) ? remove(vars.accExplosion) : 0,
		diamonds = (vars.diamonds && vars.diamonds.length) ? remove(vars.diamonds) : 0,
		id = "";
	if ((!vars.udid || !vars.udid.length) && (!vars.accountID || !vars.accountID.length)) return res.send("-1");
	if (vars.udid && vars.udid.length) {
		id = remove(vars.udid);
		if (Utils.isNumeric(id)) return res.send("-1");
	}
	if ((vars.udid && vars.udid.length) && vars.accountID !== "0") {
		id = remove(vars.accountID);
		let gjp = remove(vars.gjp),
			gjpres = GJPCheck.check(gjp, id);
		if (!gjpres) return res.send("-1");
	}
	let userID = Utils.getUserID(id, username);
	let uploadDate = parseInt(Date.now() / 1000),
		hostname = req.headers["x-forwarded-for"] || req.connection.remoteAddress,
		diff = global.database.prepare("SELECT * FROM users WHERE userID = ? LIMIT 1").all(userID);
	diff = diff[0];
	let starsDiff = stars - diff.stars,
		coinDiff = coins - diff.coins,
		demonDiff = demons - diff.demons,
		uscDiff = userCoins - diff.userCoins,
		dimDiff = diamonds - diff.diamonds;
	global.database.prepare("INSERT INTO actions (type, value, timestamp, account, value2, value3, value4, value5) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
		.run(9, starsDiff, parseInt(Date.now() / 1000), userID, coinDiff, demonDiff, uscDiff, dimDiff);
	global.database.prepare("UPDATE users SET gameVersion = ?, username = ?, coins = ?, secret = ?, stars = ?, demons = ?, icon = ?, color1 = ?, color2 = ?, iconType = ?, userCoins = ?, special = ?, accIcon = ?, accShip = ?, accBall = ?, accBird = ?, accDart = ?, accRobot = ?, accGlow = ?, IP = ?, lastPlayed = ?, accSpider = ?, accExplosion = ?, diamonds = ? WHERE userID = ?")
		.run(gameVersion, username, coins, secret, stars, demons, icon, color1, color2, iconType, userCoins, special, accIcon, accShip, accBall, accBird, accDart, accRobot, accGlow, hostname, uploadDate, accSpider, accExplosion, diamonds, userID);
	res.send(`${userID}`);
});
module.exports = { route: router, path: "/" };