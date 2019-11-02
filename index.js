'use strict'
let express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    SQLite = require('better-sqlite3'),
    connection = new SQLite("gd.db", { verbose: console.log, fileMustExist: true }),
    fs = require('fs'),
    path = require('path'),
    multer = require('multer'),
    storage = multer.memoryStorage(),
    upload = multer({ storage, limits: { fileSize: 15728640 } }).single('track');
global.path = '/sdfsdfsd';
global.database = connection;
app.use(bodyParser.raw())
.use(bodyParser.urlencoded({ extended: true }))
.use(express.static(path.join(__dirname, 'data')))
.set('view engine', 'ejs');
fs.readdir('routes', (_err, files) => {
    files.forEach(x => {
        let a = require(`./routes/${x}`);
        app.use(`${global.path + a.path}`, a.route);
    });
});
app.get('/test', (req, res) => {
    res.render('test');
})
app.post('/test', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.log(err);
            return res.send('<span style="color: red;">An error has occurred with module. Try again later</span>');
        } else {
            console.log(req.file);
            return res.send('wait...');
        }
    });
})
app.use((req, res, next) => {
    console.log(`[${req.method.toUpperCase()}]`, req.url, ' - ', req.body);
    next();
})
.listen(8080, () => console.log('ok'));