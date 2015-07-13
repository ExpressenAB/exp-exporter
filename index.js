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
var helpers = require("./lib/helpers");

var config;
var intervalObj;
var server;
var initTime;
var emitter;
var logger;
var gauges = {};
var perSecondGauges = {};
var counters = {};

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
  options.globalLabels = {app: options.appName}; //TODO: should be configurable
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
    incrementCounter("http_requests", null, "Total number of HTTP requests handled");
    incrementPerSecondGauge("http_requests", null, "Number of HTTP requests handles per second");
    next();
  });
  options.expressApp.get("/_metrics", gatherMetrics);

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
  //Write metrics from this process to file
  logger.info("exp-exporter writing metrics");
  usage.lookup(process.pid, { keepHistory: true }, function (err, result) {
    setGauge("avg_cpu_usage_per_worker", result.cpu, null, "Average CPU usage per process");
    setGauge("avg_mem_usage_per_worker", result.memory, null, "Average memory usage per process");
    var metrics = {
      workerPid: process.pid,
      timestamp: new Date().getTime()
    };

    var gaugeKeys = _.keys(gauges);
    gaugeKeys.forEach(function (gaugeKey) {
      metrics[gaugeKey] = gauges[gaugeKey].value;
    });

    var perSecondGaugesKeys = _.keys(perSecondGauges);
    perSecondGaugesKeys.forEach(function (gaugeKey) {
      metrics[gaugeKey] = perSecondGauges[gaugeKey].value * 1000 / config.writeInterval;
      perSecondGauges[gaugeKey].value = 0;
    });

    var counterKeys = _.keys(counters);
    counterKeys.forEach(function (counterKey) {
      metrics[counterKey] = counters[counterKey].value;
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
  //Locate files written by processes and respond with combined metrics
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
  //Extracts and joins metrics from files written by all processes

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

  var gaugeKeys = _.keys(gauges);
  gaugeKeys.forEach(function (gaugeKey) {
    var perWorker = gatheredMetrics.map(function (workerMetrics) {
      return workerMetrics[gaugeKey];
    });
    var avgPerWorker = _.sum(perWorker) / gatheredMetrics.length;
    promMetrics.push(prometheusResponse.gauge(
    {
      namespace: "nodejs",
      name: "nodejs_" + gauges[gaugeKey].name,
      help: gauges[gaugeKey].help
    },
    [{
      labels: gauges[gaugeKey].labels,
      value: avgPerWorker
    }]));
  });

  var perSecondGaugesKeys = _.keys(perSecondGauges);
  perSecondGaugesKeys.forEach(function (gaugeKey) {
    var perSecond = gatheredMetrics.map(function (workerMetrics) {
      return workerMetrics[gaugeKey]; //TODO: Handle workerMetrics[gaugeKey] === undefined
    });
    var totalPerSecond = _.sum(perSecond);
    promMetrics.push(prometheusResponse.gauge(
    {
      namespace: "nodejs",
      name: "nodejs_avg_" + perSecondGauges[gaugeKey].name + "_per_second",
      help: perSecondGauges[gaugeKey].help
    },
    [{
      labels: perSecondGauges[gaugeKey].labels,
      value: totalPerSecond
    }]));
  });

  var counterKeys = _.keys(counters);
  counterKeys.forEach(function (counterKey) {
    var perWorker = gatheredMetrics.map(function (workerMetrics) {
      return workerMetrics[counterKey];
    });
    var total = _.sum(perWorker);
    promMetrics.push(prometheusResponse.gauge(
    {
      namespace: "nodejs",
      name: "nodejs_" + counters[counterKey].name,
      help: counters[counterKey].help
    },
    [{
      labels: counters[counterKey].labels,
      value: total
    }]));
  });
  return promMetrics;
}

function incrementPerSecondGauge(name, labels, help) {
  if (!labels) {
    labels = {};
  }
  labels = _.defaults(labels, config.globalLabels);
  var key = metricKey(name + "PerSecond", labels);
  if (perSecondGauges[key]) {
    perSecondGauges[key].value++;
  } else {
    perSecondGauges[key] = {
      name: name,
      value: 1,
      labels: labels,
      help: help
    };
  }
}

function setGauge(name, value, labels, help) {
  if (!labels) {
    labels = {};
  }
  labels = _.defaults(labels, config.globalLabels);
  var key = metricKey(name, labels);
  if (gauges[key]) {
    gauges[key].value = value;
  } else {
    gauges[key] = {
      name: name,
      value: value,
      labels: labels,
      help: help
    };
  }
}

function incrementCounter(name, labels, help) {
  if (!labels) {
    labels = {};
  }
  labels = _.defaults(labels, config.globalLabels);
  var key = metricKey(name, labels);
  if (counters[key]) {
    counters[key].value++;
  } else {
    counters[key] = {
      name: name,
      value: 1,
      labels: labels,
      help: help
    };
  }
}

function setCounter(name, value, labels, help) {
  if (!labels) {
    labels = {};
  }
  labels = _.defaults(labels, config.globalLabels);
  var key = metricKey(name, labels);
  counters[key] = {
    name: name,
    value: value,
    labels: labels,
    help: help
  };
}

function metricKey(name, labels) {
  return name + helpers.labelsString(labels);
}

module.exports = {
  init: init,
  unInit: unInit,
  incrementPerSecondGauge: incrementPerSecondGauge,
  setGauge: setGauge,
  incrementCounter: incrementCounter,
  setCounter: setCounter
};