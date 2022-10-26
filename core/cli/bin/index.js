#!/usr/bin/env node
const importLocal = require("import-local");
const npmlog = require("npmlog");

if (importLocal(__filename)) {
  npmlog.info("cli", "正在使用 dorsey-cli 本地版本");
} else {
  // console.log(process.argv);
  require("../lib")(process.argv.slice(2));
}
