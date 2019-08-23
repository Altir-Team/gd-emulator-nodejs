'use strict';
let express = require('express'),
    router = express.Router();
router.post('/registerGJAccount(.php)?', (req, res) => {
    let username = req.body.userName.trim(),
        password = req.body.password.trim(),
        email = req.body.email.trim(),
        secret = req.body.secret.trim();
    if(!username || !password || !email || !secret) return res.send('-1');
    let msq = global.database.prepare('SELECT * FROM accounts WHERE username = ?').all(username);
    if(msq.length) return res.send('-2');
    let msq1 = global.database.prepare('SELECT * FROM accounts WHERE email = ?').all(email);
    //if(msq1.length) return res.send('есть такое мыло');
    global.database.prepare(`INSERT INTO accounts (username, password, email, secret, registerDate) VALUES (?, ?, ?, ?, ?)`)
    .run(username, password, email, req.body.secret, String(Date.now()));
    res.send('1');
});
router.post('/loginGJAccount(.php)?', (req, res) => {
    //сделать перенос уровней от зелёных к нормальному при первом логине
    let udid = req.body.udid.trim(),
        username = req.body.userName.trim(),
        password = req.body.password.trim(),
        sID = req.body.sID.trim(),
        secret = req.body.secret.trim();
    let msq = global.database.prepare('SELECT * FROM accounts WHERE username = ?').all(username);
    if(msq.length == 0) return res.send('-1');
    let id = String(msq[0].id);
    if(msq[0].password == password) {
        let userID;
        let msq1 = global.database.prepare('SELECT * FROM users WHERE extID = ?').all(id);
        if(msq1.length) userID = msq1[0].userID;
        else {
            global.database.prepare('INSERT INTO users (isRegistered, extID, username, secret) VALUES (1, ?, ?, ?)').run(id, username, secret);
            let msq3 = global.database.prepare('SELECT * FROM users WHERE extID = ? AND username = ?').all(id, username);
            userID = msq3[0].userID;
            //перенос уровней через userID, extID
        }
        res.send(`${id},${userID}`);
        if(!isNaN(udid)) {
            let q1 = global.database.prepare('SELECT * FROM users WHERE extID = ?').all(udid);
            let usrid1 = q1[0].userID;
            global.database.prepare('UPDATE levels SET userID = ?, extID = ? WHERE userID = ?').run(userID, id, usrid1);
        }
    } else { 
        return res.send('-1'); 
    }
})
module.exports = { route: router, path: "/accounts" };