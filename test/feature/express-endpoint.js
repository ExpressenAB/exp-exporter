"use strict";
var express = require("express");
var request = require("supertest");

Feature("express endpoint", function () {
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
        writeInterval: 10
      });
    });

    Then("the app should have a /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(done);
    });

    When("having made a request to some other route", function (done) {
      request(app)
        .get("/some/path")
        .expect(404)
        .end(function () {
          exporter.once("metricsWritten", function () { done(); });
        });
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

    Then("it should say that the app has handled 2 requests", function () {
      responseText.should.contain("nodejs_http_requests{app=\"the-app\"} 2");
    });

    And("making yet another request to the /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(function (err, res) {
          responseText = res.text;
          if (err) return done(err);
          done();
        });
    });

    Then("it should say that the app has handled 3 requests", function () {
      responseText.should.contain("nodejs_http_requests{app=\"the-app\"} 3");
    });
  });
});