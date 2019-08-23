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
        return userID;
    }
    static isValid (username, password) {
        let asd = global.database.prepare('SELECT * FROM accounts WHERE userName = ? AND password = ?').all(username, password);
        return asd.length ? true : false;
    }
}