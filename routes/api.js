"use strict";
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const genToken = (id, pass) => { return crypto.createHash("sha256").update(`${id}:${pass}`).digest("hex"); };

router.all("/login", (req, res) => {
	const data = global.database.prepare("SELECT * FROM accounts WHERE username = ?").all(req.query.login);
	if (!data.length) return res.json({ error: "ACC_NOT_FOUND", readable: `Account with login "${req.query.login}" not found` });
	else if (data[0].password !== req.query.pass) return res.json({ error: "PASS_NOT_MATCH", readable: "Password is not matching" });
	const key = genToken(data[0].id, data[0].password);
	if (data[0].token) global.database.prepare("UPDATE accounts SET token = ? WHERE id = ?").run(key, data[0].id);
	res.setHeader("Content-Type", "text/blank");
	return res.send(key);
});
router.all("/songs", (req, res) => {
	let data = global.database.prepare(`SELECT * FROM songs`).all();
	if (req.query.by) data = data.filter(x => x.addedBy == req.query.by)
	return res.json(data);
});
router.all("/notifications", (req, res) => {
	return res.json([
		{
			text:
            "Someone just mentioned you in comments below level with ID: 3423!",
			time: "few seconds ago"
		}
	]);
});
router.all("/getUserData", (req, res) => {
	if (!req.query[0]) return res.json({ error: "NO_AUTH", readable: "Auth token is not provided" });
	let data = global.database.prepare("SELECT * FROM accounts WHERE token = ?").all(req.query[0]);
	if (!data.length) return res.json({ error: "ACC_NOT_FOUND", readable: "Account with this auth token is not found" });
	data = data[0];
	return res.json({ id: data.id, username: data.username, email: data.email });
});
router.all("/changePass", (req, res) => {
	if (!req.query.current && !req.query.new && !req.query.token) return res.json({ error: "NO_ONE_OF_PARAMS", readable: "One of required params is not found" });
	let data = global.database.prepare("SELECT * FROM accounts WHERE token = ?").all(req.query.token);
	if (!data.length) return res.json({ error: "ACC_NOT_FOUND", readable: "Account with this auth token is not found" });
	if (data[0].password !== req.query.current) return res.json({ error: "CURR_AND_SERV_PASS_NOT_MATCHING", readable: "Current password is not matching to your current password that you provided" }); // current by user !== current in db
	if (req.query.new == data[0].password) return res.json({ error: "NEW_IS_CURR", readable: "You cannot change password to your current password" }); // new client pass == current pass, for safety
	const key = genToken(data[0].id, req.query.new);
	global.database.prepare("UPDATE accounts SET token = ?, password = ? WHERE token = ?").run(key, req.query.new, req.query.token);
	res.setHeader("Content-Type", "text/blank");
	return res.send(key);
});
router.all("/addSong", multer().single("songFile"), (req, res) => {
	if (!req.query.token) return res.json({ error: "NO_AUTH", readable: "Auth token is not provided" });
	const account = global.database.prepare("SELECT isVip, username, id FROM accounts WHERE token = ?").all(req.query.token);
	if (!account.length) return res.json({ error: "ACC_NOT_FOUND", readable: "Account with this auth token is not found" });
	if (req.file) { // file upload (VIP ONLY)
		if (account[0].isVip == 0) return res.json({ error: "NO_PERMS", readable: "Only players with V.I.P status can UPLOAD songs" });
		if (req.file.mimetype !== "audio/mpeg") return res.json({ error: "NOT_SUPPORTED_MIME", readable: "Only file with \"audio/mpeg\" mime type allowed" });
    const name = genToken(Date.now(), req.file.originalname);
    const ext = require('path').extname(req.file.originalname);
		fs.writeFile("data/music/" + name + ext, req.file.buffer, (err) => {
			if (err) return res.json({ error: "WRITE_ERROR", readable: "Something wrong happened while writing song to server" });
			global.database.prepare("INSERT INTO songs (name, authorID, authorName, size, download, addedBy) VALUES (?, ?, ?, ?, ?, ?)").run(name, "0", account[0].username, (req.file.buffer.length / 1048576).toFixed(2), `${req.protocol}://${req.get("host")}/gdEndpoint/music/${name + ext}`, account[0].id);
			return res.json({ added: true });
		});
  } else if (req.body && req.body.songUrl) { // song url (soundcloud & direct link - for all, +yt for vip)
    let url;
    try {
      url = new URL(req.body.songUrl);
    } catch (e) {
      return res.json({ error: "WRONG_URL", readable: "Something wrong with URL" });
    }
    switch(url.host) {
      case 'soundcloud.com':
        break;
      default:
        break;
    }
    return res.json({ error: "WORK_IN_PROGRESS", readable: "Temporary disabled" });
	} else { // nothing
    return res.json({ error: "NOT_SUPPORTED_TYPE", readable: "Not provided file/url" });
	}
});
module.exports = { route: router, path: "/api" };