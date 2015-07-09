"use strict";
var request = require("supertest");
var process = require("child_process");
var _ = require("lodash");

Feature("process aggregation", function () {

  Scenario("multiple processes", function () {
    var numProcesses = 4;//1 + Math.floor((Math.random() * 3) + 1);
    var processes = [];
    after(function (done) {
      processes.forEach(function (child) {
        child.kill();
      });
      setTimeout(done, 100);
    });
    When("exporter has been initialized from within multiple processes", function (done) {
      var running = {};
      function storeAsRunning(processNumber) {
        running[processNumber.toString()] = true;
      }
      for (var i = 0; i < numProcesses; i++) {
        var ls = process.fork("./test_samples/process-sample.js", [i], {});
        ls.on("message", storeAsRunning);
        processes.push(ls);
      }
      function awaitAllRunning() {
        if (_.keys(running).length === numProcesses) {
          done();
        } else {
          setTimeout(awaitAllRunning, 10);
        }
      }
      awaitAllRunning();
    });

    var responseText;
    Then("there should be an /_metrics endpoint at localhost:9090", function (done) {
      request("http://localhost:9090")
      .get("/_metrics")
      .expect(200)
      .end(function (err, res) {
        responseText = res.text;
        console.log(res.text);
        if (err) return done(err);
        done();
      });
    });

    And("the response should say that there are " + numProcesses + " workers", function () {
      responseText.should.contain("nodejs_num_workers{app=\"the-app\"} " + numProcesses);
    });

    And("the response should contain average cpu usage from all workers", function () {
      var totalExpectedCpu = 0;
      for (var i = 0; i < numProcesses; i++) {
        totalExpectedCpu += 10 + i;
      }
      var expectedAverage = totalExpectedCpu / numProcesses;
      responseText.should.contain("nodejs_avg_cpu_usage_per_worker{app=\"the-app\"} " + expectedAverage);
    });

    And("the response should contain average memory usage from all workers", function () {
      var totalExpectedMemory = 0;
      for (var i = 0; i < numProcesses; i++) {
        totalExpectedMemory += (i + 1) * 1000;
      }
      var expectedAverage = totalExpectedMemory / numProcesses;
      responseText.should.contain("nodejs_avg_mem_usage_per_worker{app=\"the-app\"} " + expectedAverage);
    });
  });
});