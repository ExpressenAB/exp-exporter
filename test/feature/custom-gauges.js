"use strict";
var request = require("supertest");

Feature("custom gauges", function () {
  var exporter;
  Scenario("transactions per second", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });
    When("exporter has been initialized with writeInterval 100", function (done) {
      exporter = require("../../index").init({
        appName: "the-app",
        writeInterval: 100
      });
      require("../../index").perSecondGauge("transactions");
      exporter.once("metricsWritten", function () { done(); });
    });

    And("10 'transactions' have been logged", function () {
      for (var i = 0; i < 10; i++) {
        require("../../index").incrementPerSecondGauge("transactions");
      }
    });

    And("having waited for 100 milliseconds", function (done) {
      setTimeout(done, 100);
    });

    var responseText;
    And("making a request to the /_metrics endpoint", function (done) {
      request("http://localhost:9090")
        .get("/_metrics")
        .expect(200)
        .end(function (err, res) {
          responseText = res.text;
          if (err) return done(err);
          done();
        });
    });

    Then("it should say that there has been 100 transactions/second", function () {
      responseText.should.contain("nodejs_avg_transactions_per_second{app=\"the-app\"} 100");
    });
  });
});