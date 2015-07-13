"use strict";
var _ = require("lodash");
var express = require("express");
var fs = require("fs");
var async = require("async");
var usage = require("usage");
var util = require("util");
var prometheusResponse = require("./lib/prometheusResponse");
var events = require("events");
var dummyLogger = require("./lib/dummyLogger");

var config;
var intervalObj;
var server;
var initTime;
var numRequestsServedByProcess = 0;
var emitter;
var logger;
var perSecondGauges = {};

function init(options) {
  logger = options.logger || dummyLogger();
  initTime = new Date().getTime();
  logger.debug("exp-exporter starting");
  if (!options || !options.appName) {
    throw new Error("You must supply an appName");
  }
  options = _.defaults(options, {
    port: 9090,
    writeInterval: 10000,
    basePath: "/tmp/"
  });
  config = options;
  emitter = new events.EventEmitter();
  try {
    ensurePath();
  } catch (ex) {
    return emitter;
  }

  writeMetrics(); //Write a first set of metrics right away before letting setInterval take over

  if (!options.expressApp) {
    process.on("uncaughtException", function (err) {
      if (err.code === "EADDRINUSE" && err.stack.indexOf("exp-exporter") > -1) {
        return; //Swallow
      }
      process.exit(1);
    });
    options.expressApp = express();
    server = options.expressApp.listen(options.port);
  }
  options.expressApp.use(function (req, res, next) {
    numRequestsServedByProcess++;
    incrementPerSecondGauge("http_requests");
    next();
  });
  options.expressApp.get("/_metrics", gatherMetrics);
  perSecondGauge("http_requests");
  intervalObj = setInterval(writeMetrics, options.writeInterval);
  return emitter;
}

function unInit() {
  clearInterval(intervalObj);
  if (server) {
    server.close();
  }
}

function getPath() {
  var basePath = config.basePath;
  if (basePath[basePath.length - 1] !== "/") {
    basePath += "/";
  }
  return config.basePath + config.appName + "/";
}

function ensurePath() {
  var path = getPath();
  if (!fs.existsSync(path)) {
    try {
      fs.mkdirSync(path);
    } catch (ex) {
      logger.error("Unable to create path %s", path);
      throw ex;
    }
  }
}

function filePrefix() {
  return util.format("exp-exporter-%s-", config.appName);
}

function writeMetrics() {
  logger.info("exp-exporter writing metrics");
  usage.lookup(process.pid, { keepHistory: true }, function (err, result) {

    var metrics = {
      workerPid: process.pid,
      timestamp: new Date().getTime(),
      cpuUsage: result.cpu,
      memoryUsage: result.memory,
      totalHttpRequestsServed: numRequestsServedByProcess,
    };
    var perSecondGaugesKeys = _.keys(perSecondGauges);
    perSecondGaugesKeys.forEach(function (gaugeKey) {
      metrics[gaugeKey + "PerSecond"] = perSecondGauges[gaugeKey] * 1000 / config.writeInterval;
      perSecondGauges[gaugeKey] = 0;
    });
    fs.writeFile(getPath() + filePrefix() + process.pid, JSON.stringify(metrics), function (err) {
      if (err) {
        return;
      }
      emitter.emit("metricsWritten", metrics);
    });
  });
}

function gatherMetrics(req, res) {
  var gatheredMetrics = [];
  fs.readdir(getPath(), function (err, files) {
    files = _.filter(files, function (file) {
      return file.indexOf(filePrefix()) === 0;
    });
    async.map(files, function (file, cb) {
      fs.readFile(getPath() + file, "utf8", function (err, data) {
        try {
          data = JSON.parse(data);
        } catch (ex) {
          data = {};
        }
        cb(err, { path: getPath() + file, data: data });
      });
    }, function (err, results) {
      if (err) {
        return res.status(500).send(err);
      }
      _.each(results, function (file) {
        var minAge = new Date(new Date().getTime() - config.writeInterval).getTime();
        if (initTime > minAge) {
          //App has recently started, we don't want files created prior to starting
          minAge = initTime;
        }
        if (!file.data.timestamp || file.data.timestamp < minAge) {
          //The file hasn't been updated during the interval. It probably belongs to a dead process, discard.
          fs.unlink(file.path);
        } else {
          gatheredMetrics.push(file.data);
        }
      });
      return prometheusResponse.respond(getPrometheusMetrics(gatheredMetrics), res);
    });
  });
}

function getPrometheusMetrics(gatheredMetrics) {
  var promMetrics = [];
  promMetrics.push(prometheusResponse.gauge(
  {
    namespace: "nodejs",
    name: "num_workers",
    help: "Number of responding workers"
  },
  [{
    labels: {app: config.appName},
    value: gatheredMetrics.length
  }]));

  var cpuUsages = gatheredMetrics.map(function (workerMetrics) {
    return workerMetrics.cpuUsage;
  });
  var avgCpuUsage = _.sum(cpuUsages) / gatheredMetrics.length;
  avgCpuUsage = Math.round(avgCpuUsage * 1000) / 1000;
  promMetrics.push(prometheusResponse.gauge(
  {
    namespace: "nodejs",
    name: "avg_cpu_usage_per_worker",
    help: "Average CPU usage per worker"
  },
  [{
    labels: {app: config.appName},
    value: avgCpuUsage
  }]));

  var memoryUsages = gatheredMetrics.map(function (workerMetrics) {
    return workerMetrics.memoryUsage;
  });
  var avgMemoryUsage = _.sum(memoryUsages) / gatheredMetrics.length;
  promMetrics.push(prometheusResponse.gauge(
  {
    namespace: "nodejs",
    name: "avg_mem_usage_per_worker",
    help: "Average memory usage per worker"
  },
  [{
    labels: {app: config.appName},
    value: avgMemoryUsage
  }]));

  var servedHttpRequests = gatheredMetrics.map(function (workerMetrics) {
    return workerMetrics.totalHttpRequestsServed;
  });
  var totalServedHttpRequests = _.sum(servedHttpRequests);
  totalServedHttpRequests = Math.round(totalServedHttpRequests * 1000) / 1000;
  promMetrics.push(prometheusResponse.counter(
  {
    namespace: "nodejs",
    name: "http_requests",
    help: "Total HTTP requests served"
  },
  [{
    labels: {app: config.appName},
    value: totalServedHttpRequests
  }]));

  var perSecondServedHttpRequests = gatheredMetrics.map(function (workerMetrics) {
    return workerMetrics.httpRequestsServedPerSecond;
  });
  var totalHttpRequestsPerSecond = _.sum(perSecondServedHttpRequests);
  promMetrics.push(prometheusResponse.gauge(
  {
    namespace: "nodejs",
    name: "nodejs_avg_http_requests_per_second",
    help: "HTTP requests served per second"
  },
  [{
    labels: {app: config.appName},
    value: totalHttpRequestsPerSecond
  }]));

  var perSecondGaugesKeys = _.keys(perSecondGauges);
  perSecondGaugesKeys.forEach(function (gaugeKey) {
    var perSecond = gatheredMetrics.map(function (workerMetrics) {
      return workerMetrics[gaugeKey + "PerSecond"];
    });
    var totalPerSecond = _.sum(perSecond);
    promMetrics.push(prometheusResponse.gauge(
    {
      namespace: "nodejs",
      name: "nodejs_avg_" + gaugeKey + "_per_second",
      help: ""
    },
    [{
      labels: {app: config.appName},
      value: totalPerSecond
    }]));
  });
  return promMetrics;
}

function perSecondGauge(name) {
  perSecondGauges[name] = 0;
}

function incrementPerSecondGauge(name) {
  perSecondGauges[name]++;
}
module.exports = {
  init: init,
  unInit: unInit,
  perSecondGauge: perSecondGauge,
  incrementPerSecondGauge: incrementPerSecondGauge
};