"use strict";
var express = require("express");
var request = require("supertest");
var async = require("async");

Feature("per second values", function () {
  Scenario("initialization with an Express app", function () {
    var app;
    var exporter;

    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 200);
    });

    Given("an Express app", function () {
      app = express();
    });

    When("exporter has been initialized with the Express app", function () {
      exporter = require("../../index").init({
        expressApp: app,
        appName: "the-app",
        writeInterval: 100
      });
    });

    And("having made 10 requests to the app", function (done) {
      async.times(10, function (id, callback) {
        request(app)
        .get("/some/path")
        .expect(404)
        .end(callback);
      }, function () {
        done();
      });
    });

    And("having waited for 100 milliseconds", function (done) {
      setTimeout(done, 100);
    });

    var responseText;
    And("making a request to the /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(function (err, res) {
          responseText = res.text;
          if (err) return done(err);
          exporter.once("metricsWritten", function () { done(); });
        });
    });

    Then("it should say that the app has handled 100 requests/second", function () {
      responseText.should.contain("nodejs_avg_http_requests_per_second{app=\"the-app\"} 100");
    });

    And("having made 5 more requests to the app", function (done) {
      async.times(5, function (id, callback) {
        request(app)
        .get("/some/path")
        .expect(404)
        .end(callback);
      }, function () {
        done();
      });
    });

    And("having waited for 100 milliseconds", function (done) {
      setTimeout(done, 100);
    });

    And("making a request to the /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(function (err, res) {
          responseText = res.text;
          if (err) return done(err);
          exporter.once("metricsWritten", function () { done(); });
        });
    });

    Then("it should say that the app has handled 50 requests/second", function () {
      responseText.should.contain("nodejs_avg_http_requests_per_second{app=\"the-app\"} 50");
    });
  });
});