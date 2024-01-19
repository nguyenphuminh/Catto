import config from "./catto.config.js";
import { UCI } from "./dist/uci.js";

const uci = new UCI(config);

uci.start();

