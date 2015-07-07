"use strict";
var request = require("supertest");

Feature("configurable app name", function () {
  Scenario("initialization without an Express app with myapp as app name", function () {
    after(function (done) {
      require("../../index").unInit();
      delete require.cache[require.resolve("../../index")];
      setTimeout(done, 20);
    });
    When("exporter has been initialized", function (done) {
      require("../../index").init({
        appName: "myapp",
        writeInterval: 20
      });
      setTimeout(done, 100);
    });

    Then("the metrics endpoint should respond with stats for that app name", function (done) {
      request("http://localhost:9090")
        .get("/_metrics")
        .expect(200)
        .expect(/myapp/)
        .end(done);
    });
  });
});