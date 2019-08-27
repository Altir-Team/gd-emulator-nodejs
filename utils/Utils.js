let fs = require('fs'),
    crypto = require('crypto');
module.exports = class Utils {
    constructor () {}
    static getUserID (extID, name = "undefined") {
        let register = !isNaN(extID) ? 1 : 0,
            userID = null,
            query = global.database.prepare('SELECT * FROM users WHERE extID = ?').all(extID);
        if (query.length) {
            userID = query[0].userID;
        } else {
            let asd = global.database.prepare('INSERT INTO users (isRegistered, extID, userName) VALUES (?, ?, ?)')
                .run(extID, register, name);
            userID = asd.lastInsertRowid;
        }
        return String(userID);
    }
    static isValid (username, password) {
        let asd = global.database.prepare('SELECT * FROM accounts WHERE userName = ? AND password = ?').all(username, password);
        return asd.length ? true : false;
    }
    static isValidID (ID) {
        let asd = global.database.prepare('SELECT * FROM accounts WHERE id = ?').all(ID);
        return asd.length ? true : false;
    }
    static isNumeric (i) {
        return !isNaN(i);
    }
    static getSongString (ID) {
        let songs = global.database.prepare(`SELECT * FROM songs WHERE ID = ?`).all(ID);
        if (!songs.length) return false;
        let song = songs[0];
        if (song.isDisabled == 1) return false;
        let dl = song.download
        if (dl.indexOf(':')) dl = encodeURIComponent(dl);
        return `1~|~${song.ID}~|~2~|~${song.name.replace(/#/g, '')}~|~3~|~${song.authorID}~|~4~|~${song.authorName}~|~5~|~${song.size}~|~6~|~~|~10~|~${dl}~|~7~|~~|~8~|~0`;
    }
    static getUserString (ID) {
        let users = global.database.prepare("SELECT * FROM users WHERE userID = ?").all(ID),
            userData = users[0];
        let extID = (userData && userData.extID) ? this.isNumeric(userData.extID) ? userData.extID : 0 : 0;
        return `${ID}:${(userData && userData.username) ? userData.username : ''}:${Number(extID)}`;
    }
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
            hash.push(String(res.levelID)[0] + String(res.levelID).slice(String(res.levelID).length - 1) + (String(res.starStars) || '0') + (String(res.coins) || '0'));
        }
        return crypto.createHash('sha1').update(hash.join('') + `xI25fpAapCQg`).digest('hex');
    }
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
        return crypto.createHash('sha1').update(hash + `xI25fpAapCQg`).digest('hex');
    }
    static genSolo2 (string) {
        let asd = crypto.createHash('sha1').update(string + `xI25fpAapCQg`).digest('hex');
        return asd;
    }
    static getExtID (ID) {
        let res = global.database.prepare("SELECT * FROM users WHERE userID = ?").all(ID);
        return (res.length && this.isNumeric(res[0])) ? res[0].extID : 0;
    }
}