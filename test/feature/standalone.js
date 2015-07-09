"use strict";
var request = require("supertest");

Feature("stand alone usage", function () {
  var exporter;
  Scenario("initialization without an Express app", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });
    When("exporter has been initialized", function (done) {
      exporter = require("../../index").init({
        appName: "the-app",
        writeInterval: 20
      });
      exporter.once("metricsWritten", function () { done(); });
    });

    Then("there should be an /_metrics endpoint at localhost:9090", function (done) {
      request("http://localhost:9090")
        .get("/_metrics")
        .expect(200)
        .end(done);
    });
  });

  Scenario("initialization without an Express app and custom port", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });
    When("exporter has been initialized with 1442 as port", function () {
      exporter = require("../../index").init({
        appName: "the-app",
        port: 1442
      });
    });

    Then("there should be an /_metrics endpoint at localhost:1442", function (done) {
      request("http://localhost:1442")
        .get("/_metrics")
        .expect(200)
        .end(done);
    });
  });
});