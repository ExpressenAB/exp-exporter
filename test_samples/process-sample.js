"use strict";
var usage = require("usage");
var processNumber = parseInt(process.argv[2]);

usage.lookup = function (pid, options, callback) {
  callback(null, {
    memory: (processNumber + 1) * 1000,
    cpu: 10 + processNumber
  });
};

var exporter = require("../index").init({
  appName: "the-app",
  writeInterval: 100
});

exporter.once("metricsWritten", function () {
  process.send(processNumber);
});