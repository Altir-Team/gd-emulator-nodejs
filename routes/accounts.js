"use strict";
const express = require("express"),
	router = express.Router(),
	{ web, checkKeys } = require('../utils');
router.post("/registerGJAccount(.php)?", web.gdMiddleware, (req, res) => {
	const { body } = req;
	if (!checkKeys(body, ['userName', 'password', 'email'])) return res.send('-1');
	const username = body.userName.trim(),
		password = body.password.trim(),
		email = body.email.trim();
	let nameCheck = global.database.prepare("SELECT * FROM accounts WHERE username = ?").all(username);
	if(nameCheck.length) return res.send("-2");
	const mailCheck = global.database.prepare("SELECT * FROM accounts WHERE email = ?").all(email);
	if(mailCheck.length) return res.send('-6');
	global.database.prepare("INSERT INTO accounts (username, password, email, secret, registerDate) VALUES (?, ?, ?, ?, ?)")
		.run(username, password, email, body.secret, String(parseInt(Date.now() / 1000)));
	res.send("1");
});
router.post("/loginGJAccount(.php)?", web.gdMiddleware, (req, res) => {
	const { body } = req;
	if (!checkKeys(body, ['udid', 'userName', 'password', 'sID'])) return res.send('-1');
	//сделать перенос уровней от зелёных к нормальному при первом логине
	const udid = body.udid.trim(),
		username = body.userName.trim(),
		password = body.password.trim(),
		secret = body.secret.trim();
	const msq = global.database.prepare("SELECT * FROM accounts WHERE username = ?").all(username);
	if(msq.length == 0) return res.send("-1");
	const id = String(msq[0].id);
	if(msq[0].password == password) {
		let userID;
		const msq1 = global.database.prepare("SELECT * FROM users WHERE extID = ?").all(id);
		if(msq1.length) userID = msq1[0].userID;
		else {
			global.database.prepare("INSERT INTO users (isRegistered, extID, username, secret) VALUES (1, ?, ?, ?)").run(id, username, secret);
			let msq3 = global.database.prepare("SELECT * FROM users WHERE extID = ? AND username = ?").all(id, username);
			userID = msq3[0].userID;
			//перенос уровней
		}
		global.database.prepare("INSERT INTO actions (type, value, timestamp, value2) VALUES (?, ?, ?, ?)").run(2, username, parseInt(Date.now() / 1000), req.headers["x-forwarded-for"] || req.connection.remoteAddress);
		res.send(`${id},${userID}`);
		if(!isNaN(udid)) {
			const q1 = global.database.prepare("SELECT * FROM users WHERE extID = ?").all(udid);
			const usrid1 = q1[0].userID;
			global.database.prepare("UPDATE levels SET userID = ?, extID = ? WHERE userID = ?").run(userID, id, usrid1);
		}
	} else { 
		return res.send("-1"); 
	}
});
module.exports = { route: router, path: "/accounts" };