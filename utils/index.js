module.exports = Object.assign(require("./Utils"), {
	exploitPatch: require("./exploitPatch"),
	Utils: require("./Utils"),
	XOR: require("./XOR"),
	GJPCheck: require("./gjpcheck"),
	web: require('./webApp')
});