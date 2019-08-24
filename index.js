'use strict'
let express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    SQLite = require('better-sqlite3'),
    connection = new SQLite("gd.db", { verbose: console.log, fileMustExist: true }),
    fs = require('fs'),
    path = require('path');
global.path = '/sdfsdfsd';
global.database = connection;
app.use(bodyParser.raw())
.use(bodyParser.urlencoded({ extended: true }))
.use(express.static(path.join(__dirname, 'data')))
fs.readdir('routes', (_err, files) => {
    files.forEach(x => {
        let a = require(`./routes/${x}`);
        app.use(`${global.path + a.path}`, a.route);
    });
});
app.use((req, res, next) => {
    console.log(req.url, ' - ', req.body);
    next();
})
.listen(8080, () => console.log('ok'));