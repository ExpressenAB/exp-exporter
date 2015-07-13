"use strict";

var prometheusResponse = require("../lib/prometheusResponse");

describe("prometheusResponse", function () {
  describe(".gauge() should return a valid gauge string", function () {
    it("should write it as expected", function () {
      var gauge = prometheusResponse.gauge({namespace: "nodejs", name: "mygauge", help: "A great gauge"}, [{ labels: {app: "applabel"}, value: 10.5 }]);
      gauge.should.eql("# HELP nodejs_mygauge A great gauge\n# TYPE nodejs_mygauge gauge\nnodejs_mygauge{app=\"applabel\"} 10.5");
      // # HELP nodejs_mygauge A great gauge
      // # TYPE nodejs_mygauge gauge
      // nodejs_mygaube{app="applabel"} 10.5
    });
  });

  describe(".gauge() called with multiple labels for the same value should return a valid gauge string", function () {
    it("should write it as expected", function () {
      var gauge = prometheusResponse.gauge({namespace: "nodejs", name: "mygauge", help: "A great gauge"}, [{ labels: {app: "applabel", mylabel: "labelvalue"}, value: 10.5}]);
      gauge.should.eql("# HELP nodejs_mygauge A great gauge\n# TYPE nodejs_mygauge gauge\nnodejs_mygauge{app=\"applabel\",mylabel=\"labelvalue\"} 10.5");
    });
  });

  describe(".gauge() without help text should return a valid gauge string with empty help", function () {
    it("should write it as expected", function () {
      var gauge = prometheusResponse.gauge({namespace: "nodejs", name: "mygauge"}, [{ labels: {app: "applabel"}, value: 10.5 }]);
      gauge.should.eql("# HELP nodejs_mygauge \n# TYPE nodejs_mygauge gauge\nnodejs_mygauge{app=\"applabel\"} 10.5");
    });
  });

  describe(".gauge() called with multiple labels for the same value should return a valid gauge string", function () {
    it("should write it as expected", function () {
      var gauge = prometheusResponse.gauge({namespace: "nodejs", name: "mygauge", help: "A great gauge"}, [{ labels: {app: "applabel", mylabel: "first"}, value: 10.5}, { labels: {app: "applabel", mylabel: "second"}, value: 42.4242}]);
      gauge.should.eql("# HELP nodejs_mygauge A great gauge\n# TYPE nodejs_mygauge gauge\nnodejs_mygauge{app=\"applabel\",mylabel=\"first\"} 10.5\nnodejs_mygauge{app=\"applabel\",mylabel=\"second\"} 42.4242");
    });
  });

  describe(".counter() should return a valid counter string", function () {
    it("should write it as expected", function () {
      var counter = prometheusResponse.counter({namespace: "nodejs", name: "mycounter", help: "A great counter"}, [{ labels: {app: "applabel"}, value: 10.5 }]);
      counter.should.eql("# HELP nodejs_mycounter A great counter\n# TYPE nodejs_mycounter counter\nnodejs_mycounter{app=\"applabel\"} 10.5");
    });
  });

  describe(".counter() called with multiple labels for the same value should return a valid counter string", function () {
    it("should write it as expected", function () {
      var counter = prometheusResponse.counter({namespace: "nodejs", name: "mycounter", help: "A great counter"}, [{ labels: {app: "applabel", mylabel: "labelvalue"}, value: 10.5}]);
      counter.should.eql("# HELP nodejs_mycounter A great counter\n# TYPE nodejs_mycounter counter\nnodejs_mycounter{app=\"applabel\",mylabel=\"labelvalue\"} 10.5");
    });
  });

  describe(".counter() called with multiple labels for the same value should return a valid counter string", function () {
    it("should write it as expected", function () {
      var counter = prometheusResponse.counter({namespace: "nodejs", name: "mycounter", help: "A great counter"}, [{ labels: {app: "applabel", mylabel: "first"}, value: 10.5}, { labels: {app: "applabel", mylabel: "second"}, value: 42.4242}]);
      counter.should.eql("# HELP nodejs_mycounter A great counter\n# TYPE nodejs_mycounter counter\nnodejs_mycounter{app=\"applabel\",mylabel=\"first\"} 10.5\nnodejs_mycounter{app=\"applabel\",mylabel=\"second\"} 42.4242");
    });
  });
  describe(".respond(), when writing a gauge and a counter", function () {
    var gauge = prometheusResponse.gauge({namespace: "nodejs", name: "mygauge", help: "A great gauge"}, [{ labels: {app: "applabel"}, value: 10.5 }]);
    var counter = prometheusResponse.counter({namespace: "nodejs", name: "mycounter", help: "A great counter"}, [{ labels: {app: "applabel"}, value: 42 }]);
    it("should write it as expected", function () {
      var res = {};
      res.writeHead = function () {};
      res.end = function () {};
      res.write = function (text) {
        text.should.eql("# HELP nodejs_mygauge A great gauge\n# TYPE nodejs_mygauge gauge\nnodejs_mygauge{app=\"applabel\"} 10.5\n# HELP nodejs_mycounter A great counter\n# TYPE nodejs_mycounter counter\nnodejs_mycounter{app=\"applabel\"} 42\n");
      };
      prometheusResponse.respond([gauge, counter], res);
    });
  });
});