"use strict";
var request = require("supertest");
var exporter = require("../../index");

Feature("stand alone usage", function () {
  Scenario("initialization without an Express app", function () {
    When("exporter has been initialized", function () {
      exporter.init();
    });

    Then("there should be an /_metrics endpoint at localhost:1442", function (done) {
      request("http://localhost:1442")
        .get("/_metrics")
        .expect(200)
        .end(done);
    });
  });
});