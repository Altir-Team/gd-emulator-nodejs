'use strict';
let express = require('express'),
    router = express.Router(),
    { exploitPatch, Utils } = require('../utils'),
    { remove } = exploitPatch,
    fs = require('fs'),
    zlib = require('zlib'),
    crypto = require('crypto'); 
router.post(['/accounts/backupGJAccount(.php)?', '/database/accounts/backupGJAccountNew(.php)?'], (req, res) => {
    let vars = req.body,
        userName = remove(vars.userName),
        password = vars.password,
        saveData = remove(vars.saveData),
        valid = Utils.isValid(userName, password);
    if (valid) {
        let saveDataArr = saveData.split(';');
        saveData = Buffer.from(saveDataArr[0].replace(/-/g, "+").replace(/_/g, '/'), 'base64');
        saveData = zlib.gunzipSync(saveData);
        saveData = Buffer.from(saveData, 'gzip').toString('ascii');
        let orbs = saveData.split('</s><k>14</k><s>')[1].split('</s>')[0],
            lvls = saveData.split('<k>GS_value</k>')[1].split('</s><k>4</k><s>')[1].split('</s>')[0];
        saveData = zlib.gzipSync(saveData);
        saveData = Buffer.from(saveData).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        saveData = `${saveData};${saveDataArr[1]}`;
        let asd = global.database.prepare('SELECT * FROM accounts WHERE userName = ?').all(userName);
        if(isNaN(asd[0].id)) return res.send('-1');
        fs.writeFile(`data/accounts/${asd[0].id}`, saveData, (err) => {
            if (err) console.log(err);
            let dsa = global.database.prepare('SELECT * FROM users WHERE userName = ? LIMIT 1').all(userName),
                extID = dsa[0].extID;
            global.database.prepare('UPDATE users SET orbs = ?, completedLvls = ? WHERE extID = ?')
                .run(orbs, lvls, extID);
            res.send('1');
        });
    } else {
        res.send('-1');
    }
});
router.post(['/accounts/syncGJAccount(20)?(.php)?', '/database/accounts/syncGJAccountNew(.php)?'], (req, res) => {
    let vars = req.body,
        username = remove(vars.userName),
        password = vars.password,
        secret = "",
        saveData = "";
    if (!Utils.isValid(username, password)) return res.send('-1');
    let acc = global.database.prepare('SELECT * FROM accounts WHERE username = ?').all(username),
        account = acc[0];
        
    if (isNaN(account.id)) return res.send('-1');
    if (!fs.existsSync(`data/accounts/${account.id}`)) {
        saveData = account.saveData;
        if (saveData.slice(0, 4) == "SDRz") saveData = Buffer.from(saveData, 'base64').toString('utf8');
    } else {
        saveData = fs.readFileSync(`data/accounts/${account.id}`, 'utf8');
    }
    console.log(saveData)
    return res.send(`${saveData};21;30;a;a`);
});
module.exports = { route: router, path: "/" };