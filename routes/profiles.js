"use strict";
let express = require("express"),
	router = express.Router(),
	{ exploitPatch, GJPCheck, web } = require("../utils"),
	{ remove, numbers } = exploitPatch;
router.post("/getGJUserInfo(20)?(.php)?",web.gdMiddleware,  (req, res) => {
	let vars = req.body,
		me = 0,
		gjp = remove(vars.gjp);
	if (vars.accountID && vars.accountID.length) {
		me = numbers(vars.accountID);
		let gjpres = GJPCheck.check(gjp, me);
		console.log(gjpres);
	}
	return res.send("-1");
});
module.exports = { route: router, path: "/" };