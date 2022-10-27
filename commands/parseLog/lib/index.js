"use strict";
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const glob = require("glob");
const inquirer = require("inquirer");
const Command = require("@dorsey-cli/command");
const log = require("@dorsey-cli/log");

class ParseLogCommand extends Command {
  init() {
    this.promptInfo = {};
  }

  // 获取要搜索的日志日志关键字信息
  async getPromptInfo() {
    glob(
      "**",
      {
        cwd: process.cwd(),
        ignore: ["**/node_modules/**"],
        nodir: true,
      },
      async (err, files) => {
        if (err) throw err;
        const logFiles = files.filter((item) => item.includes("pvpClient"));
        if (logFiles.length <= 0) {
          log.info("当前目录没有符合解析条件的日志文件");
          return;
        }
        this.promptInfo = await inquirer.prompt([
          {
            type: "list",
            name: "logFile",
            message: "请选择要解析的日志文件",
            choices: logFiles,
            // default: logFiles[0],
          },
          {
            type: "input",
            name: "responseKey",
            message: "请输入接口返回的key值",
            default: "",
            validate: function (v) {
              const done = this.async();

              setTimeout(function () {
                if (!v) {
                  done("请输入接口返回的key值");
                  return;
                }
                done(null, true);
              }, 0);
            },
          },
        ]);
        if (Object.keys(this.promptInfo).length > 0) {
          this.parse();
        } else {
          throw new Error("命令行参数解析错误");
        }
      }
    );
  }

  parse() {
    const { logFile, responseKey } = this.promptInfo;
    if (logFile) {
      // 读取日志文件
      fs.readFile(logFile, "utf-8", (err, datastr) => {
        // 正则匹配出要查看的接口相关字符串片段
        const rexp = new RegExp(`\\[2022.+${responseKey}.+}+`, "g");
        const filterContent = datastr.match(rexp);
        if (filterContent && filterContent.length > 0) {
          // 筛选出时间和接口返回数据信息
          const data = filterContent.map((item) => {
            const logTime = item.match(
              /[0-9]+-[0-9]+-[0-9]+T[0-9]+:[0-9]+:[0-9]+\.[0-9]+/g
            );
            const apiData = item.match(/{.+}+/g);
            let jsonData = null;
            try {
              if (apiData && apiData.length > 0) {
                jsonData = JSON.parse(apiData[0]);
              }
            } catch (e) {
              jsonData = null;
            }
            return {
              [logTime && logTime.length > 0 ? logTime[0] : "未知日期"]:
                jsonData || { info: "数据解析错误" },
            };
          });
          if (data.length > 0) {
            // 整合数据为json格式并写入result.json
            const resultJson = {};
            data.forEach((item) => {
              const timeKey = Object.keys(item)[0];
              resultJson[timeKey] = item[timeKey];
            });
            try {
              fse.writeJSONSync(
                path.resolve(process.cwd(), "log-result.json"),
                resultJson
              );
              log.info("日志解析成功");
            } catch (err) {
              throw new Error("日志解析失败");
            }
          }
        }
      });
      // logContent = logContent.match
    }
  }

  exec() {
    try {
      this.getPromptInfo();
    } catch (err) {
      log.error(err);
      if (process.env.LOG_LEVEL === "verbose") console.log(err);
    }
  }
}

function parseLog(argv) {
  return new ParseLogCommand(argv);
}

module.exports = parseLog;
module.exports.ParseLogCommand = ParseLogCommand;
