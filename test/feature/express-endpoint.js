"use strict";
var express = require("express");
var request = require("supertest");

Feature("express endpoint", function () {
  afterEach(function (done) {
    require("../../index").unInit();
    delete require.cache[require.resolve("../../index")];
    setTimeout(done, 200);
  });

  Scenario("initialization with an Express app", function () {
    var app;

    Given("an Express app", function () {
      app = express();
    });

    When("exporter has been initialized with the Express app", function (done) {
      require("../../index").init({
        expressApp: app,
        writeInterval: 20
      });
      setTimeout(done, 100);
    });

    Then("the app should have a /_metrics endpoint", function (done) {
      request(app)
        .get("/_metrics")
        .expect(200)
        .end(done);
    });
  });
});