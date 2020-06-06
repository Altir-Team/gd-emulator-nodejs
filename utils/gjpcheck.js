let { sessionGrants } = require("../config"),
	XOR = require("./XOR"),
	Utils = require("./Utils");
module.exports = class GJPCheck {
	constructor() {}
	static check (gjp, accountID) {
		if(sessionGrants) {
			let actionsCount = global.database.prepare("SELECT * FROM actions WHERE type = ? AND value = ? AND timestamp > ?").all(10, accountID, parseInt(Date.now() / 1000));
			if(actionsCount.length) return true;
		}
		let gjpdecode = XOR.cipher(Buffer.from(gjp.replace(/_/g, "/").replace(/-/g, "+"), "base64").toString("utf8"), 37526),
			generatePass = Utils.isValidID(accountID, gjpdecode);
		if(generatePass && sessionGrants) global.database.prepare("INSERT INTO actions (type, value, timestamp) VALUES (?, ?, ?)").run(10, accountID, parseInt(Date.now() / 1000));
		return generatePass;
	}
};