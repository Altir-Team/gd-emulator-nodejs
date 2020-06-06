"use strict";
let express = require("express"),
	router = express.Router(),
	{ checkKeys, web } = require('../utils'),
	path = require('path');
router.all("/getAccountURL(.php)?", web.gdMiddleware, (req, res) => {
	if (!checkKeys(req.body, ['accountID', 'type'])) return res.send('-1');
	const account = global.database.prepare('SELECT * FROM accounts WHERE id = ?').all(req.body.accountID);
	if (![1, 2].includes(req.body.type) && !account.length) return res.send('-1');
	res.send(path.dirname(`${req.protocol}://${req.get('host') + req.originalUrl}`));
});
module.exports = { route: router, path: "/" };