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

    And("incrementPerSecondGauge('transactions') has been called 10 times", function () {
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

    And("setGauge('logged_in_users', 4242) has been called", function (done) {
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

    And("incrementCounter('logins') has been incremented 5 times", function (done) {
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

    And("setCounter('logins', 42) has benn called", function (done) {
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

Feature("custom counter with custom label using incrementCounter", function () {
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

    And("incrementCounter({'logins', {mylabel: 'myvalue'}) has been incremented 7 times", function (done) {
      for (var i = 0; i < 7; i++) {
        require("../../index").incrementCounter("logins", {mylabel: "myvalue"});
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

    Then("it should say that there have been 7 log-ins for the counter with the label included", function () {
      responseText.should.contain("nodejs_logins{mylabel=\"myvalue\",app=\"the-app\"} 7");
    });
  });
});

Feature("custom counter with custom label using setCounter", function () {
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

    And("setCounter('logins', 42, {mylabel: 'myvalue'}) has benn called", function (done) {
      require("../../index").setCounter("logins", 42, {mylabel: "myvalue"});
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
      responseText.should.contain("nodejs_logins{mylabel=\"myvalue\",app=\"the-app\"} 42");
    });
  });
});

Feature("custom counters with the same name but different labels using incrementCounter", function () {
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

    And("incrementCounter({'logins', {success: true}) has been incremented 7 times", function (done) {
      for (var i = 0; i < 7; i++) {
        require("../../index").incrementCounter("logins", {success: true});
      }
      exporter.once("metricsWritten", function () { done(); });
    });

    And("incrementCounter({'logins', {success: false}) has been incremented 4 times", function (done) {
      for (var i = 0; i < 4; i++) {
        require("../../index").incrementCounter("logins", {success: false});
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

    Then("it should say that there have been 7 successfull log-ins", function () {
      responseText.should.contain("nodejs_logins{success=\"true\",app=\"the-app\"} 7");
    });

    Then("it should say that there have been 4 unsuccessfull log-ins", function () {
      responseText.should.contain("nodejs_logins{success=\"false\",app=\"the-app\"} 4");
    });
  });
});