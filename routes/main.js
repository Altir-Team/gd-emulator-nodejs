'use strict';
let express = require('express'),
    router = express.Router(),
    { exploitPatch, Utils, XOR } = require('../utils'),
    { remove, numcolon, numbers } = exploitPatch,
    fs = require('fs'),
    zlib = require('zlib'),
    fuse = require('fuse.js'),
    moment = require('moment');
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
        order = "uploadDate DESC",
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
        order = 'likes DESC';
        if (str.length) {
            if(Utils.isNumeric(str)) { params = [`levelID = ${parseInt(str)}`]; search = false; }
            else search = true;
        }
    }
    if (type == 1) order = 'downloads DESC';
    if (type == 2) order = 'likes DESC';
    if (type == 3) { // тренды
        let uploadDate = Date.now() - (7 * 24 * 60 * 60);
        params.push(`uploadDate > ${uploadDate}`);
        order = "likes";
    }
    if (type == 4) order = "uploadDate ASC";
    if (type == 5) params.push(`userID = '${Number(str)}'`);
    if (type == 6 || type == 17) { // фичуры
        params.push("NOT starFeatured = '0'");
        order = 'rateDate DESC, uploadDate DESC';
    }
    if (type == 16) { // эпики
        params.push("NOT starEpic = '0'");
        order = "rateDate DESC, uploadDate DESC";
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
        order = "rateDate DESC, uploadDate DESC";
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
    if (order && order.length) queryText += ` ORDER BY ${order}`;
    queryText += ` LIMIT 10 OFFSET ${offset}`;
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
            lvlString.push(strig + `1:${x.levelID}:2:${x.levelName}:5:${x.levelVersion}:6:${x.userID}:8:10:9:${x.starDifficulty}:10:${x.downloads}:12:${x.audioTrack}:13:${x.gameVersion}:14:${x.likes}:17:${x.starDemon !== 0 ? x.starDemon : ''}:43:${x.starDemonDiff}:25:${x.starAuto !== 0 ? x.starAuto : ''}:18:${x.starStars}:19:${x.starFeatured}:42:${x.starEpic}:45:${x.objects}:3:${x.levelDesc}:15:${x.levelLength}:30:${x.original}:31:0:37:${x.coins}:38:${x.starCoins}:39:${x.requestedStars}:46:1:47:2:40:${x.isLDM}:35:${x.songID}`);
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
    res.send(resString);
});
router.post('/downloadGJLevel(19|20|21|22)?(.php)?', (req, res) => {
    let vars = req.body,
        gameVersion = (vars.gameVersion && vars.gameVersion.length) ? remove(Array.isArray(vars.gameVersion) ? vars.gameVersion[0] : vars.gameVersion) : 1;
    if(!vars.levelID || !vars.levelID.length) return res.send('-1');
    let levelID = remove(vars.levelID),
    feaID = 0,
    daily = 0,
    levelString = "";
    if(isNaN(levelID)) return res.send('-1');
    switch (levelID) {
        case -1:
            let asd = global.database.prepare('SELECT * FROM dailyFeatures WHERE timestamp < ? AND type = 0 ORDER BY DESC LIMIT 1').all(Date.now());
            let lvl = asd[0];
            levelID = lvl.levelID;
            feaID = lvl.feaID + 100001;
            daily = 1;
            break;
        case -2:
            let asdf = global.database.prepare('SELECT * FROM dailyFeatures WHERE timestamp < ? AND type = 1 ORDER BY DESC LIMIT 1').all(Date.now());
            let lvll = asdf[0];
            levelID = lvl.levelID;
            feaID = lvll.feaID + 100001;
            daily = 1;
            break;
    }
    let levels = global.database.prepare('SELECT * FROM levels WHERE levelID = ?').all(Number(levelID));
    if(levels.length) {
        let lvl = levels[0];
        // Сделать только одно скачивание на юзера/ip
        global.database.prepare('UPDATE levels SET downloads = downloads + 1 WHERE levelID = ?').run(Number(levelID));
        let uploadDate = moment(lvl.uploadDate).fromNow(),
            updateDate = moment(lvl.updateDate).fromNow(),
            { password, levelDesc: description } = lvl,
            xorPass = password;
        if (gameVersion > 19) {
            xorPass = Buffer.from(XOR.cipher(password, 26364)).toString('base64');
        } else {
            description = remove(Buffer.from(description, 'base64').toString('ascii'));
        }
        if (fs.existsSync(`data/levels/${levelID}`))
            levelString = fs.readFileSync(`data/levels/${levelID}`, 'utf8');
        else levelString = lvl.levelString;
        if (gameVersion > 18) {
            if (levelString.slice(0, 3) == 'kS1') {
                levelString = Buffer.from(zlib.gzipSync(levelString)).toString('base64');
                levelString = levelString.replace(/\//g, '_').replace(/\+/g, '-');
            }
        }
        //orig 1:500000:2:best level ever:3::4:eJx1mUtyJCkQBS9UCyA-gM1qztDH6PvvR9VFVkY-71nJ9CwJJH8kkku_f_WXt9fvX-PVR_x8tNeI90d_vdN49TZ-PuYn_be_2j_91ftrvDzjZS-P9-ft-_kYd7DvwOMdtOeKWLIihgZRgv59otsdhAarBO8Z2WVoTg1cdvksKUM_T9Rg3oHnHeR36DTZZSqfuWXb2WSXz4wapAZbvtvPjLLLCg0U8lrydSyFvBTyUshbIW_XYMouWyFvhbwr5LiX7O_Q3hRqbwqgN22iNyV_VpW9z6pHovDPnIKhd4Xbu_LvXXmfVXVyV-JnVYFxrcrvGXwkn72G9tKHFtOHNnNW1d2HdnNW1e_dQN5A3tCXoQtDF4YuDF3YVj7nmXJaHO042nG042jH0Y7rC9EDnKPr5ADV6JiDdgLkE-QT5BPkE-QT5BPkE-Szks-yqpzDCfIT5CfIT5CfID9BfuHML3SxQHXhzC-0s_RCupLynW50sdHFRhcbXWx0sdHFRhd7SzLaED4nKbuPpl2Mpl2c5DE5dHJX8qMr-dGV_Enq5K7kz-Ryxq5n7rd7DCU_hpIfQ8mPoeRPUncfyvlMfiRNaRg4GzgbOBs4m575M7mcw-uZQsPRhaMLRxeOLhxduN5RI0A-QD5APkA-QD5APkA-mp6Ns-p-K0eii0QXiS4SXSS6SLxfE-QnyE-QnyA_QX6C_AL5BfIL5BfIL5BfIL9AflXyUZ4p53CD_Ab5DfIb5DfIbyVvTclbU_LWlPxJyuSz6pHo_XM9c58x69qFde3CunZhXbs4Sd29axdn8iPR-8eGkreh5G0o-ZPUyUPJn8ml9-uZu3czdGHowtCFoQtDF6ZvgTnIO8hDT81B3kHeQd5B3vX-ueaUswGztUAXgS4CXUB3LfAWQHgtQT5BPkEe0msJ8tBNg_caxNdgvjZBHqprsGGbev9cSTmH0F2DERsM2BbIw4GtavKn97Oq9A4vNoixwYxtowu4sW3twmG-DvN1-LLDhb1pFw7zddixN71_HC7scGGHC3tX8g4X9q73z5XcvTvM12G-DvP1oeQd5usD5GG1_rDaT4J2Hnbc71V1L3iuw4Xd9P5xmK_DfB3m6zBfd3QB83XX-8cD5OHCDqv1AHnYscOOHebrMF-H-TrM1xPk4bkOF_bU--dKCnmYr8N8HebrE-Rhvj5BHubrMF-H-foCeZivL_3953rmvusc5uswX4f5OszX4bAOz3W4sG-9fwKeG_DcgOcGPDca_sTc9P65Vt29B1w4uv7dOR523O9n6l5w4ej6FgTMN2C-AfMNmG_AfAPmGzDfgPkGzDdgvgHzDZhvwHzD9GfulRTyMN-A-QbMN2C-AfMNmG_AfAPmGzDfgPkGzDdgvgHzjdD7J2C-AfMNmG_AfAPmGzDfgPkGzDdgvgHzDZhvwHwD5hsw34D5Bsw3YL4B8w2Yb8B8Y-nP3GtVIQ_zDZhvwHwD5hsw34D5Jsw3Yb4J802Yb8J8syn5hOcmPDfhuQnPTXhuwnMTnptdz_yV3DdAwnwT5psw34T5Jsw3h94_16q794T5Jsw3Yb4J802Yb8J8E-abMN98mG-_kzoZVpsOzv74rfLz0P6_yBCdL8DeyVeH3583id-n4G9xu-PPl_hV6L_mdcwjv-f4_BMvGVPjMuUR30P2fsdVumvyORiPpP3hMP4k9WCU5BynmrS7UP4DG_99vpKfVf8B_BkqOQ==:5:1:6:511298:8:10:9:20:10:11840:12:0:13:7:14:-594:17::43:4:25:1:18:0:19:0:42:0:45:0:15:1:30:0:31:0:28:5 years:29:5 years:35:0:36::37:0:38:0:39:0:46::47::40::27:0#d6231aa1ce13e29791b4ec80a3007697d0ddadcd#07d84f907ae58d69f8a86abca955720f9f00db07
        //gdps "1:".$result["levelID"].":2:".$result["levelName"].":3:".$desc.":4:".$levelstring.":5:".$result["levelVersion"].":6:".$result["userID"].":8:10:9:".$result["starDifficulty"].":10:".$result["downloads"].":11:1:12:".$result["audioTrack"].":13:".$result["gameVersion"].":14:".$result["likes"].":17:".$result["starDemon"].":43:".$result["starDemonDiff"].":25:".$result["starAuto"].":18:".$result["starStars"].":19:".$result["starFeatured"].":42:".$result["starEpic"].":45:".$result["objects"].":15:".$result["levelLength"].":30:".$result["original"].":31:1:28:".$uploadDate. ":29:".$updateDate. ":35:".$result["songID"].":36:".$result["extraString"].":37:".$result["coins"].":38:".$result["starCoins"].":39:".$result["requestedStars"].":46:1:47:2:48:1:40:".$result["isLDM"].":27:$xorPass"
        //let response = `1:${lvl.levelID}:2:${lvl.levelName}:3:${description}:4:${levelString}:5:${lvl.levelVersion}:6:${lvl.userID}:8:10:9:${lvl.starDifficulty}:10:${lvl.downloads}:11:1:12:${lvl.audioTrack}:13:${lvl.gameVersion}:14:${lvl.likes}:17:${lvl.starDemon}:43:${lvl.starDemonDiff}:25:${lvl.starAuto}:18:${lvl.starStars}:19:${lvl.starFeatured}:42:${lvl.starEpic}:45:${lvl.objects}:15:${lvl.levelLength}:30:${lvl.original}:31:1:28:${uploadDate}:29:${updateDate}:35:${lvl.songID}:36:${lvl.extraString}:37:${lvl.coins}:38:${lvl.starCoins}:39:${lvl.requestedStars}:46:1::47:2:48:1:40:${lvl.isLDM}:27:${xorPass}`;
        let response = `1:${lvl.levelID}:2:${lvl.levelName}:3:${description}:4:${levelString}:5:${lvl.levelVersion}:6:${lvl.userID}:8:9:10:${lvl.starDifficulty}:10:${lvl.downloads}:11:1:12:${lvl.audioTrack}:13:${lvl.gameVersion}:14:${lvl.likes}:17:${lvl.starDemon}:43:${lvl.starDemonDiff}:25:${lvl.starAuto}:18:${lvl.starStars}:19:${lvl.starFeatured}:42:${lvl.starEpic}:45:${lvl.objects}:15:${lvl.levelLength}:30:${lvl.original}:31:1:28:${uploadDate}:29:${updateDate}:35:${lvl.songID}:36:${lvl.extraString}:37:${lvl.coins}:38:${lvl.starCoins}:39:${lvl.requestedStars}:46:1:47:2:48:1:40:${lvl.isLDM}:27:${xorPass}`; //это пиши а
        if (daily == 1) response += `:41:${feaID}`;
        response += `#${Utils.genSolo(levelString)}#`;
        let smth = `${Number(lvl.userID)},${lvl.starStars},${lvl.starDemon},${lvl.levelID},${lvl.starCoins},${lvl.starFeatured},${password},${feaID}`;
        response += `${Utils.genSolo2(smth)}#`;
        if (daily == 1) response += Utils.getUserString(lvl.userID);
        else response += smth;
        return res.send(response); 
    } else {
        return res.send('-1');
    }
});
module.exports = { route: router, path: "/" };