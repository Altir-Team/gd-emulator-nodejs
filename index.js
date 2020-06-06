"use strict";
// if you use web serving software (like nginx, apache), then remove routePath and put '/' in registering routes
let express = require("express"),
	bodyParser = require("body-parser"),
	app = express(),
	SQLite = require("better-sqlite3"),
	connection = new SQLite("gd.db", { verbose: console.log, fileMustExist: true }),
	fs = require("fs"),
	path = require("path"),
	form = require("express-form-data"),
	{ path: routePath } = require('./config'),
	cors = require('cors');
global.database = connection;
app.use(bodyParser.raw())
	.use(bodyParser.urlencoded({ extended: true }))
	.use('/gdEndpoint', express.static("data"))
	.use(form.union())
	.use(cors())
	.set("view engine", "ejs");
fs.readdir("routes", (_err, files) => {
	files.forEach(x => {
		const a = require(`./routes/${x}`);
		let b = (typeof routePath == 'string' ?  path.join(routePath, a.path) : a.path).replace(/\\/g, '/');
		if (routePath !== null) {
			if (b.length == routePath.length + 1) b = b.slice(0, -1);
		}
		app.use(b, a.route);
	});
});
app.use((req, _, next) => {
	console.log(`[${req.method.toUpperCase()}]`, req.url);
	next();
});

app.listen(3090, () => console.log("ok"));