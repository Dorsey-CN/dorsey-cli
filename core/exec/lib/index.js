"use strict";

const path = require("path");
const os = require("os");
const cp = require("child_process");
const Package = require("@dorsey-cli/package");
const log = require("@dorsey-cli/log");
const { execAsync } = require("@dorsey-cli/utils");
const getCommandInfo = require("./get-command-info");

const CACHE_DIR = "dependencies";

async function exec() {
  const userHome = os.homedir();
  const homePath = process.env.CLI_HOME_PATH;
  let targetPath = process.env.CLI_TARGET_PATH;
  let storeDir = "";
  const commandInfo = await getCommandInfo();
  let pkgName = "";
  // 通过数据里面存储的命令映射数据筛选出对应的packageName
  if (commandInfo && Array.isArray(commandInfo)) {
    const currentCmd = commandInfo.find(
      (item) => item.name === arguments[arguments.length - 1].name()
    );
    pkgName = currentCmd ? currentCmd.npmName : "";
  }
  if (!pkgName) throw new Error("未找到对应的命令Package");
  const pkgVersion = "latest";
  let pkg;

  // 如果targetPath不存在
  if (!targetPath) {
    targetPath = path.resolve(userHome, homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    pkg = new Package({
      targetPath,
      storeDir,
      pkgName,
      pkgVersion,
    });
    const packageExist = await pkg.exist();
    if (!packageExist) {
      await pkg.install();
    } else {
      await pkg.update();
    }
  } else {
    pkg = new Package({
      targetPath,
      pkgName,
      pkgVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  log.verbose(rootFile);
  if (rootFile) {
    try {
      // 创建子进程，执行command命令
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          key === "opts" ||
          (cmd.hasOwnProperty(key) && !key.startsWith("_") && key !== "parent")
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      await execAsync("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    } catch (errMsg) {
      log.error(errMsg);
    }
  }
}

module.exports = exec;
