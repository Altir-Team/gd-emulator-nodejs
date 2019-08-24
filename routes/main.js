'use strict';
let express = require('express'),
    router = express.Router(),
    { exploitPatch, Utils } = require('../utils'),
    { remove, numcolon, numbers } = exploitPatch,
    fs = require('fs'),
    zlib = require('zlib'),
    fuse = require('fuse.js');
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
router.post(['/database/accounts/syncGJAccountNew(.php)?', '/accounts/syncGJAccount(20)?(.php)?'], (req, res) => {
    //отдает путь к сохранению
});
router.post('/getGJLevels(21|20)?(.php)?', (req, res) => {
    let vars = req.body,
        lvlString = [],
        userString = [],
        songsString = [],
        lvlsMultiString = [],
        gauntlet = "",
        str = "",
        order = "uploadDate",
        demonFilter = 0,
        offset = 0,
        search = false,
        params = ['NOT unlisted = 1'],
        gameVersion = vars.gameVersion ? numbers(vars.gameVersion) : 0,
        pushIfOne = (array, variable, text) => {
            if(variable == 1) array.push(text);
        };
    if(isNaN(gameVersion) || gameVersion == 0) return res.send('-1');
    if(gameVersion == 20) {
        let binaryVersion = numbers(vars.binaryVersion);
        if(binaryVersion > 27) gameVersion++;
    }
    let type = vars.type ? numbers(vars.type) : 0,
        diff = vars.diff ? numcolon(vars.diff) : '-';
    pushIfOne(params, vars.featured, "starFeatured = 1");
    pushIfOne(params, vars.original, "original = 0");
    pushIfOne(params, vars.coins, "starCoins = 1 AND NOT coins = 0");
    pushIfOne(params, vars.epic, "starEpic = 1");
    if (vars.uncompleted && vars.uncompleted == 1) {
        let completedLvls = numcolon(vars.completedLevels);
        params.push(`NOT levelID IN (${completedLvls})`);
    }
    if (vars.onlyCompleted && vars.onlyCompleted == 1) {
        let completedLvls = numcolon(vars.completedLevels);
        params.push(`levelID IN (${completedLvls})`);
    }
    if (vars.song) {
        let song = numbers(vars.song);
        if (!vars.customSong) {
            song--;
            params.push(`audioTrack = '${song}' AND songID = '0'`);
        } else {
            params.push(`songID = '${song}'`);
        }
    }
    pushIfOne(params, vars.twoPlayer, "twoPlayer = '1'");
    if (vars.star) params.push("NOT starStars = '0'");
    if (vars.noStar) params.push("starStars = '0'");
    if (vars.gauntlet) {
        order = false;
        gauntlet = remove(vars.gauntlet),
            gaut = global.database.prepare('SELECT * FROM gauntlets WHERE id = ?').all(gauntlet);
        gaut = gaut[0];
        str = Object.values(gaut).join(',');
        params.push(`levelID IN (${str})`);
        type = -1;
    }
    let len = vars.len ? numcolon(vars.len) : '-';
    if (len !== '-' && len.length) params.push(`levelLength IN (${len})`);
    switch (diff) {
        case -1:
            params.push("starDifficulty = '0'");
            break;
        case -3:
            params.push("starAuto = '1'");
            break;
        case -2:
            demonFilter = vars.demonFilter ? numbers(vars.demonFilter) : 0;
            params.push("starDemon = '1'");
            switch (demonFilter) {
                case 1: 
                    params.push("starDemonDiff = '3'");
                    break;
                case 2:
                    params.push("starDemonDiff = '4'");
                    break;
                case 3:
                    params.push("starDemonDiff = '0'");
                    break;
                case 4:
                    params.push("starDemonDiff = '5'");
                    break;
                case 5:
                    params.push("starDemonDiff = '6'");
                    break;
                default: 
                    break;
            }
            break;
        case "-":
            break;
        default:
            if (diff) {
                diff = diff.replace(/,/g, '0,') + '0';
                params.push(`starDifficulty IN (${diff}) AND starAuto = '0' AND starDemon = '0'`);
            }
            break;
    }
    if (vars.str && vars.str.length) str = remove(vars.str);
    if (vars.page && Utils.isNumeric(vars.page)) offset = vars.page > 10 ? numbers(vars.page) + '0' : '0';
    if (type == 0 || type == 15) {
        order = 'likes';
        if (str.length) {
            if(Utils.isNumeric(str)) { params = [`levelID = ${str}`]; search = false; }
            else search = true;
        }
    }
    if (type == 1) order = 'downloads';
    if (type == 2) order = 'likes';
    if (type == 3) { // тренды
        let uploadDate = Date.now() - (7 * 24 * 60 * 60);
        params.push(`uploadDate > ${uploadDate}`);
        order = "likes";
    }
    if (type == 5) params.push(`userID = '${Number(str)}'`);
    if (type == 6 || type == 17) { // фичуры
        params.push("NOT starFeatured = '0'");
        order = 'rateDate DESC, uploadDate';
    }
    if (type == 16) { // эпики
        params.push("NOT starEpic = '0'");
        order = "rateDate DESC, uploadDate";
    }
    if (type == 7) { // магические уровни
        params.push('objects > 9999');
    }
    if (type == 10) { // мап паки
        order = false;
        params.push(`levelID in (${str})`);
    }
    if (type == 11) { // оцененные
        params.push("NOT starStars = '0'");
        order = "rateDate DESC, uploadDate";
    }
    if (type == 12) { // уровни от фолловеров
        let followed = numcolon(vars.followed);
        params.push(`extID IN (${followed})`);
    }
    if (type == 13) {  // друзья 
        
    }
    let querybase = "FROM levels";
    if (params.length) querybase += ` WHERE (${params.join(' ) AND (')})`;
    let queryText = `SELECT * ${querybase}`;
    if (order) queryText + ` ORDER BY ${order} DESC`;
    queryText = queryText + ` LIMIT 10 OFFSET ${offset}`;
    let TotalLvlCount = global.database.prepare(`SELECT * ${querybase}`).all().length,
        result = global.database.prepare(queryText).all();
    if (search === true) {
        let a = new fuse(result, { keys: ['levelName'] });
        result = a.search(str);
    }
    result.map(x => {
        if (x.levelID) {
            lvlsMultiString.push(x.levelID);
            let strig = "";
            if(gauntlet.length) strig += `44:${gauntlet}:`;
            //`1:${x.levelID}:2:${x.levelName}:5:${x.levelVersion}:6:${x.userID}:8:10:9:${x.starDifficulty}:10:${x.downloads}:12:${x.audioTrack}:13:${x.gameVersion}:14:${x.likes}:17:${x.starDemon == 0 ? x.starDemon : ''}:43:${x.starDemonDiff}:25:${x.starAuto == 0 ? x.starAuto : ''}:18:${x.starStars}:19:${x.starFeatured}:42:${x.starEpic}:45:${x.objects}:3:${x.levelDesc}:15:${x.levelLength}:30:${x.original}:31:0:37:${x.coins}:38:${x.starCoins}:39:${x.requestedStars}:46:1:2:35:${x.songID}|`
            lvlString.push(strig + `1:${x.levelID}:2:${x.levelName}:5:${x.levelVersion}:6:${x.userID}:8:10:9:${x.starDifficulty}:10:${x.downloads}:12:${x.audioTrack}:13:${x.gameVersion}:14:${x.likes}:17:${x.starDemon}:43:${x.starDemonDiff}:25:${x.starAuto}:18:${x.starStars}:19:${x.starFeatured}:42:${x.starEpic}:45:${x.objects}:3:${x.levelDesc}:15:${x.levelLength}:30:${x.original}:31:0:37:${x.coins}:38:${x.starCoins}:39:${x.requestedStars}:46:1:47:2:40:${x.isLDM}:35:${x.songID}`);
            if (x.songID !== 0) {
                let song = Utils.getSongString(x.songID);
                if(song) songsString.push(song);
            }
            userString.push(`${Utils.getUserString(x.userID.split('.')[0])}`);
        }
    });
    lvlString = lvlString.join('|');
    userString = userString.join('|');    
    songsString = songsString.join('~:~');
    let resString = "";
    resString = `${lvlString}#${userString}`;
    if (gameVersion > 18) resString += `#${songsString}`;
    resString += `#${TotalLvlCount}:${offset}:10#`;
    resString += Utils.genMulti(lvlsMultiString);
    let a = fs.readFileSync('testSearch.txt', { encoding: "utf8" })
    res.send(resString);
});
module.exports = { route: router, path: "/" };