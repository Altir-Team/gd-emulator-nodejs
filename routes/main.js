'use strict';
let express = require('express'),
    router = express.Router();
router.all('/getAccountURL(.php)?', (req, res) => {
    let url = `${req.protocol}://${req.get('host') +  global.path}`;
    res.send(url);
});
module.exports = { route: router, path: "/" };