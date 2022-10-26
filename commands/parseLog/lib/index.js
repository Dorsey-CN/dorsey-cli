"use strict";
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const glob = require("glob");
const inquirer = require("inquirer");
const Command = require("@dorsey-cli/command");
const log = require("@dorsey-cli/log");

class ParseLogCommand extends Command {
  init() {}

  // 获取要搜索的日志日志关键字信息
  async getPromptInfo() {
    this.responseKey = (
      await inquirer.prompt({
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
      })
    ).responseKey;
  }

  parse() {
    glob(
      "**",
      {
        cwd: process.cwd(),
        ignore: ["**/node_modules/**"],
        nodir: true,
      },
      (err, files) => {
        // console.log(files);
        // 过滤选择出要处理的log文件
        const clientLog = files.find((file) => file.includes("pvpClient"));
        if (clientLog) {
          // 读取日志文件
          fs.readFile(clientLog, "utf-8", (err, datastr) => {
            // 正则匹配出要查看的接口相关字符串片段
            const rexp = new RegExp(`\\[2022.+${this.responseKey}.+}+`, "g");
            const filterContent = datastr.match(rexp);
            // console.log(filterContent);
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
              // console.log(data);
              if (data.length > 0) {
                // 整合数据为json格式并写入result.json
                const resultJson = {};
                data.forEach((item) => {
                  const timeKey = Object.keys(item)[0];
                  resultJson[timeKey] = item[timeKey];
                });
                // console.log(resultJson);
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
    );
  }

  async exec() {
    try {
      await this.getPromptInfo();
      if (this.responseKey) {
        this.parse();
      } else {
        throw new Error("获取参数错误");
      }
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
