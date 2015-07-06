"use strict";
var request = require("supertest");
var process = require("child_process");

Feature("process aggregation", function () {

  Scenario("multiple processes", function () {
    var numProcesses = 1 + Math.floor((Math.random() * 3) + 1);
    var processes = [];
    after(function (done) {
      processes.forEach(function (child) {
        child.kill();
      });
      setTimeout(done, 50);
    });
    When("exporter has been initialized from within multiple processes", function (done) {
      for (var i = 0; i < numProcesses; i++) {
        var ls = process.fork("./test_samples/process-sample.js", [i], {});
        processes.push(ls);
      }
      setTimeout(done, 600);
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
      responseText.should.contain("ns_num_workers{app=\"applabel\"} " + numProcesses);
    });
  });
});