const { secret } = require('../config');
module.exports = class WebAppUtils {
    static gdMiddleware (req, res, next) {
        if (!req.body || !req.body.secret || req.body.secret !== secret) return res.send('-1');
        else next();
    }
}