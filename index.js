"use strict";
var Prometheus = require("prometheus-client");
var client = new Prometheus();
var _ = require("lodash");
var express = require("express");
var fs = require("fs");
var async = require("async");

var numWorkers;
var config;
var intervalObj;

function init(options) {
  options = options || {};
  options = _.defaults(options, {
    port: 9090,
    writeInterval: 10000
  });
  config = options;
  var isListening = false;
  if (!options.expressApp) {
    process.on("uncaughtException", function(err) {
      if(err.code === "EADDRINUSE" && err.stack.indexOf("exp-exporter") > -1) {
        return; //Swallow
      }
      process.exit(1);
    });
    options.expressApp = express();
    options.expressApp.listen(options.port);
  }
  options.expressApp.get("/_metrics", gatherMetrics);
  numWorkers = client.newGauge({namespace: "ns", name: "num_workers", help: "Number of responding workers"});
  intervalObj = setInterval(writeMetrics, options.writeInterval);
}

function unInit() {
  clearInterval(intervalObj);
}

function writeMetrics() {
  var metrics = {
    worker_pid: process.pid,
    timestamp: new Date().getTime()
  };
  fs.writeFile("/tmp/exp-exporter-applabel-" + process.pid, JSON.stringify(metrics));
}

function gatherMetrics(req, res) {
  var gatheredMetrics = [];
  fs.readdir("/tmp/", function (err, files) {
    files = _.filter(files, function (file) {
      return file.indexOf("exp-exporter-applabel-") === 0;
    });
    async.map(files, function (file, cb) {
      fs.readFile("/tmp/" + file, "utf8", function(err, data) {
        try {
          data = JSON.parse(data);
        } catch (ex) {
          data = {};
        }
        cb(err, { path: "/tmp/" + file, data: data });
      });
    }, function(err, results) {
      if(err) {
        return res.status(500).send(err);
      }
      _.each(results, function (file) {
        if(!file.data.timestamp || file.data.timestamp < new Date(new Date().getTime() - config.writeInterval).getTime()) {
          fs.unlink(file.path);
        } else {
          gatheredMetrics.push(file.data);
        }
      });
      numWorkers.set({app: "applabel"}, gatheredMetrics.length, true, null);
      return client.metricsFunc()(req, res);
    });
  });
}

module.exports = {
  init: init,
  unInit: unInit
};