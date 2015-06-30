"use strict";
var request = require("supertest");
var exporter = require("../../index");

Feature("stand alone usage", function () {
  Scenario("initialization without an Express app", function () {
    When("exporter has been initialized", function () {
      exporter.init();
    });

    Then("there should be an /metrics endpoint at localhost:9090", function (done) {
      request("http://localhost:9090")
        .get("/metrics")
        .expect(200)
        //.end(done);
        .end(function (err, res) {
          console.log(res.body);
          if (err) return done(err);
          done();
        });
    });
  });

  Scenario("initialization without an Express app and custom port", function () {
    When("exporter has been initialized with 1442 as port", function () {
      exporter.init({
        port: 1442
      });
    });

    Then("there should be an /metrics endpoint at localhost:1442", function (done) {
      request("http://localhost:1442")
        .get("/metrics")
        .expect(200)
        .end(done);
    });
  });
});