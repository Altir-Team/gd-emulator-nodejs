'use strict';
let express = require('express'),
    router = express.Router(),
    { exploitPatch, Utils } = require('../utils'),
    { remove } = exploitPatch,
    fs = require('fs'),
    zlib = require('zlib');
router.all('/getAccountURL(.php)?', (req, res) => {
    let url = `${req.protocol}://${req.get('host') +  global.path}`;
    res.send(url);
});
router.post('/uploadGJLevel21(.php)?', (req, res) => {
    let vars = req.body;
    let id = remove(vars.accountID),
        gameVersion = remove(vars.gameVersion),
        binaryVersion = vars.binaryVersion ? remove(vars.binaryVersion) : 0,
        userName = remove(vars.userName),
        levelID = remove(vars.levelID),
        levelName = remove(vars.levelName),
        levelDesc = gameVersion < 20 ? Buffer.from(remove(vars.levelDesc)).toString('base64') : remove(vars.levelDesc),
        levelVersion = remove(vars.levelVersion),
        levelLength = remove(vars.levelLength),
        audioTrack = remove(vars.audioTrack),
        auto = vars.auto ? remove(vars.auto) : 0,
        password = vars.password ? remove(vars.password) : gameVersion > 17 ? 0 : 1,
        original = vars.original ? remove(vars.original) : 0,
        twoPlayer = vars.twoPlayer ? remove(vars.twoPlayer) : 0,
        songID = vars.songID ? remove(vars.songID) : 0,
        objects = vars.objects ? remove(vars.objects) : 0,
        coins = vars.coins ? remove(vars.coins) : 0,
        requestedStars = vars.requestedStars ? remove(vars.requestedStars) : 0,
        extraString = vars.extraString ? remove(vars.extraString) : "29_29_29_40_29_29_29_29_29_29_29_29_29_29_29_29",
        levelString = remove(vars.levelString),
        levelInfo = vars.levelInfo ? remove(vars.levelInfo) : 0,
        secret = remove(vars.secret),
        unlisted = vars.unlisted ? remove(vars.unlisted) : 0,
        ldm = vars.ldm ? remove(vars.ldm) : 0,
        accountID = "";
    if (vars.udid) {
        let id = remove(vars.udid);
        if (!isNaN(id)) return res.send('-1');
    }
    let userID = Utils.getUserID(id, userName),
        uploadDate = String(Date.now());
    //сделать cd (cooldown)
    if (levelString !== "" && levelName !== "") {
        let levels = global.database.prepare('SELECT * FROM levels WHERE levelID = ? AND userID = ?').all(levelID, userID);
        if (levels.length) {
            global.database.prepare('UPDATE levels SET levelName = ?, gameVersion = ?, binaryVersion = ?, userName = ?, ' +
            'levelDesc = ?, levelVersion = ?, levelLength = ?, audioTrack = ?, auto = ?, password = ?, original = ?, twoPlayer = ?, ' +
            'songID = ?, objects = ?, coins = ?, requestedStars = ?, extraString = ?, levelString = ?, levelInfo = ?, secret = ?, ' +
            'updateDate = ?, unlisted = ?, isLDM = ? WHERE levelID = ? AND extID = ?').run(levelName, gameVersion, binaryVersion, userName,
                levelDesc, levelVersion, levelLength, audioTrack, auto, password, original, twoPlayer, songID, objects, coins, requestedStars,
                extraString, levelString, levelInfo, secret, uploadDate, unlisted, ldm, levelID, id);
            fs.writeFile(`data/levels/${levelID}`, levelString, (err) => {
                if (err) console.log(err);
                res.send(`${levelID}`);
            })
        } else {
            let query = global.database.prepare("INSERT INTO levels (levelName, gameVersion, binaryVersion, userName, levelDesc, levelVersion, " +
            "levelLength, audioTrack, auto, password, original, twoPlayer, songID, objects, coins, requestedStars, extraString, " +
            "levelString, levelInfo, secret, uploadDate, userID, extID, updateDate, unlisted, isLDM)" +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .run(levelName, gameVersion, binaryVersion, userName,
                    levelDesc, levelVersion, levelLength, audioTrack, auto, password, original, twoPlayer, songID, objects, coins, requestedStars,
                    extraString, levelString, levelInfo, secret, uploadDate, userID, id, uploadDate, unlisted, ldm);
            levelID = query.lastInsertRowid;
            fs.writeFile(`data/levels/${levelID}`, levelString, (err) => {
                if (err) console.log(err);
                res.send(`${levelID}`);
            })
        }
    } else {
        res.send('-1');
    }
});
router.post(['/accounts/backupGJAccount(.php)?', '/database/accounts/backupGJAccountNew(.php)?'], (req, res) => {
    console.log('kock')
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
module.exports = { route: router, path: "/" };