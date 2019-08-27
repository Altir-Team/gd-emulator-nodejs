'use strict';
let express = require('express'),
    router = express.Router(),
    { exploitPatch, Utils } = require('../utils'),
    { remove } = exploitPatch,
    fetch = require('node-fetch');
router.post('/getGJSongInfo(.php)?', (req, res) => {
    let vars = req.body;
    if (!vars.songID || !vars.songID.length) return res.send('-1');
    let songID = remove(vars.songID),
        songs = global.database.prepare('SELECT * FROM songs WHERE ID = ?').all(songID),
        songString = (id, name, aid, aname, ssize, dl) => `1~|~${id}~|~2~|~${name}~|~3~|~${aid}~|~4~|~${aname}~|~5~|~${ssize}~|~6~|~~|~10~|~${dl}~|~7~|~`;
    if (!songs.length) return new Promise((resolve, _reject) => {
        fetch(`https://www.newgrounds.com/audio/listen/${songID}`).then(x => x.text()).then(x => {
            if (x.match(/<title>(.*)<\/title>/)[1] == "Whoops, that's a swing and a miss!") resolve(res.send('-1'));
            let songName = x.match(/<title>(.*)<\/title>/)[1],
                downloadLink = x.match(/(?:\w+:)?\/\/[^/]+([^?#]+)/g).filter(c => c.includes('audio.ngfiles.com'))[0].slice(67).replace(/\\/g, ''),
                author = x.match(/"artist":"(.*?)"/g)[0].slice(10, -1);
            fetch(downloadLink).then(c => {
                let size = (c.headers.get('Content-Length') / 1000000).toFixed(2);
                global.database.prepare('INSERT INTO songs (ID, name, authorID, authorName, size, download, isDisabled) VALUES (?, ?, ?, ?, ?, ?, ?)').run(songID, songName, '1', author, size, downloadLink, '0');
                resolve(res.send(songString(songID, songName, '1', author, size, downloadLink)));
            });
        });
    });
    let song = songs[0];
    if (song.isDisabled == '1') return res.send('-2');
    let dlLink = song.download;
    if (dlLink.indexOf(':') !== "-1") dlLink = encodeURIComponent(dlLink);
    return res.send(songString(songID, song.name, song.authorID, song.authorName, song.size, song.download));
});
module.exports = { route: router, path: "/" };