"use strict";
var Prometheus = require("prometheus-client");
var client = new Prometheus();
var _ = require("lodash");
var express = require("express");
var fs = require("fs");
var async = require("async");
var usage = require("usage");

var numWorkers;
var avgCpuPerWorker;
var config;
var intervalObj;
var server;

function init(options) {
  if(!options || !options.appName) {
    throw new Error("You must supply an appName");
  }
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
    server = options.expressApp.listen(options.port);
  }
  options.expressApp.get("/_metrics", gatherMetrics);
  numWorkers = client.newGauge({namespace: "nodejs", name: "num_workers", help: "Number of responding workers"});
  avgCpuPerWorker = client.newGauge({namespace: "nodejs", name: "avg_cpu_usage_per_worker", help: "Average CPU usage per worker"});
  intervalObj = setInterval(writeMetrics, options.writeInterval);
}

function unInit() {
  clearInterval(intervalObj);
  if (server) {
    server.close();
  }
}

function filePrefix() {

}

function writeMetrics() {
  usage.lookup(process.pid, { keepHistory: true }, function (err, result) {

    var metrics = {
      workerPid: process.pid,
      timestamp: new Date().getTime(),
      cpuUsage: result.cpu
    };
    fs.writeFile("/tmp/exp-exporter-applabel-" + process.pid, JSON.stringify(metrics));
  });
  
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
      var cpuUsages = gatheredMetrics.map(function (workerMetrics) {
        return workerMetrics.cpuUsage;
      });
      var avgCpuUsage = _.sum(cpuUsages) / gatheredMetrics.length;
      numWorkers.set({app: config.appName}, gatheredMetrics.length, true, null);
      avgCpuPerWorker.set({app: config.appName}, avgCpuUsage, true, null);
      return client.metricsFunc()(req, res);
    });
  });
}

module.exports = {
  init: init,
  unInit: unInit
};