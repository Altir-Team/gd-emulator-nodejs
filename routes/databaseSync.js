'use strict';
let express = require('express'),
    router = express.Router();
router.post('/syncGJAccountNew(.php)?', (req, res) => {
    let username = req.body.userName.trim(),
        password = req.body.password.trim(),
        secret = req.body.secret.trim(),
        gameVersion = req.body.gameVersion.trim(),
        binaryVersion = req.body.binaryVersion.trim(),
        gdw = req.body.gdw.trim(),
        msq = global.database.prepare('SELECT * FROM accounts WHERE username = ?').all(username);
});
module.exports = { route: router, path: "/database/accounts" };