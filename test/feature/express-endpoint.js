"use strict";
var express = require("express");
var request = require("supertest");
var exporter = require("../../index");

Feature("express endpoint", function () {
  Scenario("initialization with an Express app", function () {
    var app;
    Given("an Express app", function () {
      app = express();
    });

    When("exporter has been initialized with the Express app", function () {
      exporter.init({
        expressApp: app
      });
    });

    Then("the app should have a /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(done);
    });
  });
});