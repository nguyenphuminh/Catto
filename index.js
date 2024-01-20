const config = require("./catto.config");
const { UCI } = require("./dist/uci");

const uci = new UCI(config);

uci.start();

