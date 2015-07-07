"use strict";
var usage = require("usage");

usage.lookup = function (pid, options, callback) {
  callback(null, {
    cpu: 10 + parseInt(process.argv[2])
  });
};

require("../index").init({
  appName: "the-app",
  writeInterval: 20
});