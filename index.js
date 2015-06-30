"use strict";
var Prometheus = require("prometheus-client");
var client = new Prometheus();
var _ = require("lodash");

function init(options) {
  options = options || {};
  options = _.defaults(options, {
    port: 9090
  });
  if (options.expressApp) {
    options.expressApp.get("/_metrics", client.metricsFunc());
  } else {
    client.listen(options.port);
  }
}

module.exports = {
  init: init
};