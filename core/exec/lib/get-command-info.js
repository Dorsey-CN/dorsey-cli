const request = require("@dorsey-cli/request");

module.exports = function () {
  return request({
    url: "project/command",
  });
};
