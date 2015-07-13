"use strict";
var request = require("supertest");

Feature("custom per second gauges", function () {
  var exporter;
  Scenario("transactions per second gauge", function () {
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
      exporter.once("metricsWritten", function () { done(); });
    });

    And("a perSecondGauge named 'transactions' has been added", function () {
      require("../../index").perSecondGauge("transactions");
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

Feature("custom gagues with setting of value", function () {
  var exporter;
  Scenario("currently logged in users gauge", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });

    When("exporter has been initialized", function (done) {
      exporter = require("../../index").init({
        appName: "the-app",
        writeInterval: 100
      });
      exporter.once("metricsWritten", function () { done(); });
    });

    And("a gauge named 'logged_in_users' has been added", function () {
      require("../../index").gauge("logged_in_users");
    });

    And("the value for 'logged_in_users' has been set to 4242", function (done) {
      require("../../index").setGauge("logged_in_users", 4242);
      exporter.once("metricsWritten", function () { done(); });
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

    Then("it should say that there are 4242 logged in users", function () {
      responseText.should.contain("nodejs_logged_in_users{app=\"the-app\"} 4242");
    });
  });
});

Feature("custom counter using incrementCounter", function () {
  var exporter;
  Scenario("counting log-ins", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });

    When("exporter has been initialized", function (done) {
      exporter = require("../../index").init({
        appName: "the-app",
        writeInterval: 50
      });
      exporter.once("metricsWritten", function () { done(); });
    });

    And("a counter named 'logins' has been added", function () {
      require("../../index").counter("logins");
    });

    And("the 'logins' counter has been incremented 5 times", function (done) {
      for (var i = 0; i < 5; i++) {
        require("../../index").incrementCounter("logins");
      }
      exporter.once("metricsWritten", function () { done(); });
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

    Then("it should say that there have been 5 log-ins", function () {
      responseText.should.contain("nodejs_logins{app=\"the-app\"} 5");
    });
  });
});

Feature("custom counter using setCounter", function () {
  var exporter;
  Scenario("counting log-ins", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });

    When("exporter has been initialized", function (done) {
      exporter = require("../../index").init({
        appName: "the-app",
        writeInterval: 50
      });
      exporter.once("metricsWritten", function () { done(); });
    });

    And("a counter named 'logins' has been added", function () {
      require("../../index").counter("logins");
    });

    And("the 'logins' counter has been set to 42", function (done) {
      require("../../index").setCounter("logins", 42);
      exporter.once("metricsWritten", function () { done(); });
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

    Then("it should say that there have been 42 log-ins", function () {
      responseText.should.contain("nodejs_logins{app=\"the-app\"} 42");
    });
  });
});