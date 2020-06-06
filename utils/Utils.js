let fs = require("fs"),
	crypto = require("crypto");
module.exports = class Utils {
	/**
	 * @param {Number|String} extID 
	 * @param {String} name 
	 */
	static getUserID (extID, name = "undefined") {
		let register = !isNaN(extID) ? 1 : 0,
			userID = null,
			query = global.database.prepare("SELECT * FROM users WHERE extID = ?").all(extID);
		if (query.length) {
			userID = query[0].userID;
		} else {
			let asd = global.database.prepare("INSERT INTO users (isRegistered, extID, userName) VALUES (?, ?, ?)")
				.run(extID, register, name);
			userID = asd.lastInsertRowid;
		}
		return String(userID);
	}
	/**
	 * @param {String} username 
	 * @param {String} password 
	 */
	static isValid (username, password) {
		const asd = global.database.prepare("SELECT * FROM accounts WHERE userName = ? AND password = ?").all(username, password);
		return asd.length ? true : false;
	}
	/**
	 * @param {Number|String} ID 
	 * @param {Boolean|String} pass 
	 */
	static isValidID (ID, pass = false) {
		const asd = global.database.prepare("SELECT * FROM accounts WHERE id = ?").all(ID);
		if (pass === false) {
			return asd.length ? true : false;
		} else {
			if (!asd.length) return false;
			return this.isValid(asd[0].username, pass);
		}
	}
	/**
	 * @param {Number} int
	 */
	static isNumeric (int) {
		return !isNaN(int);
	}
	/**
	 * @param {Number|String} ID 
	 */
	static getSongString (ID) {
		const songs = global.database.prepare("SELECT * FROM songs WHERE ID = ?").all(String(ID));
		if (!songs.length) return false;
		const song = songs[0];
		if (song.isDisabled == 1) return false;
		let dl = song.download;
		if (dl.indexOf(":")) dl = encodeURIComponent(dl);
		return `1~|~${song.ID}~|~2~|~${song.name.replace(/#/g, "")}~|~3~|~${song.authorID}~|~4~|~${song.authorName}~|~5~|~${song.size}~|~6~|~~|~10~|~${dl}~|~7~|~~|~8~|~0`;
	}
	/**
	 * @param {Number|String} ID 
	 */
	static getUserString (ID) {
		let users = global.database.prepare("SELECT * FROM users WHERE userID = ?").all(ID),
			userData = users[0];
		let extID = (userData && userData.extID) ? this.isNumeric(userData.extID) ? userData.extID : 0 : 0;
		return `${ID}:${(userData && userData.username) ? userData.username : ""}:${Number(extID)}`;
	}
	/**
	 * @param {String} string 
	 */
	static genMulti (string) {
		let lvlsArray = string.filter(x => x !== ""),
			hash = [];
		for (let i of lvlsArray) {
			if(!this.isNumeric(i)) return "-1";
			let asd = global.database.prepare("SELECT * FROM levels WHERE levelID = ?").all(String(i)),
				res = asd[0];
			let levelString = res.levelString;
			if(!fs.existsSync(`data/levels/${i}`)) {
				fs.writeFileSync(`data/levels/${i}`, levelString);
				global.database.prepare("UPDATE levels SET levelString = '' WHERE levelID = ?").run(i);
			}
			hash.push(String(res.levelID)[0] + String(res.levelID).slice(String(res.levelID).length - 1) + (String(res.starStars) || "0") + (String(res.coins) || "0"));
		}
		return crypto.createHash("sha1").update(hash.join("") + "xI25fpAapCQg").digest("hex");
	}
	/**
	 * @param {String} string 
	 */
	static genSolo (string) {
		let hash = "",
			len = string.length,
			divided = parseInt(len / 40),
			p = 0;
		for (let i = 0; i < len; i += divided) {
			if (p > 39) break;
			hash += string[i];
			p++;
		}
		return crypto.createHash("sha1").update(hash + "xI25fpAapCQg").digest("hex");
	}
	/**
	 * @param {String} string 
	 */
	static genSolo2 (string) {
		let asd = crypto.createHash("sha1").update(string + "xI25fpAapCQg").digest("hex");
		return asd;
	}
	/**
	 * @param {Number|String} ID 
	 */
	static getExtID (ID) {
		let res = global.database.prepare("SELECT * FROM users WHERE userID = ?").all(ID);
		return (res.length && this.isNumeric(res[0])) ? res[0].extID : 0;
	}
	/**
	 * @param {Object} object 
	 * @param {Array} keys 
	 */
	static checkKeys (object, keys) {
		if (typeof object !== 'object') throw new Error('"object" argument must be Object');
		if (typeof keys !== 'object' || !Array.isArray(keys)) throw new Error('"keys" must be Array object');
		if (!keys.length) throw new Error('"keys" length must be more than 0');
		const check = keys.map(x => object.hasOwnProperty(x));
		return !check.includes(false);
	}
};