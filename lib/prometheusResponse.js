"use strict";
var util = require("util");
var helpers = require("./helpers");

function gauge(options, metricValues) {
  //TODO: validera
  return singleValueMetric("gauge", options, metricValues);
}

function counter(options, metricValues) {
  return singleValueMetric("counter", options, metricValues);
}

function singleValueMetric(type, options, metricValues) {
  var fullName = util.format("%s_%s", options.namespace, options.name);
  var value = util.format("# HELP %s %s\n", fullName, options.help);
  value += util.format("# TYPE %s %s\n", fullName, type);
  for (var i = 0; i < metricValues.length; i++) {
    value += util.format("%s%s %s", fullName, helpers.labelsString(metricValues[i].labels), metricValues[i].value);
    if (i + 1 < metricValues.length) {
      value += "\n";
    }
  }
  return value;
}

function respond(metrics, res) {
  res.writeHead(200, {
    "content-type": "text/plain; version=0.0.4"
  });
  res.write(metrics.join("\n") + "\n");
  return res.end();
}

module.exports = {
  gauge: gauge,
  counter: counter,
  respond: respond
};