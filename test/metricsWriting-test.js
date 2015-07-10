"use strict";
var request = require("supertest");

describe("exporter, when initialized with a long writeInterval", function () {
  after(function (done) {
    require("../index").unInit();
    delete require.cache[require.resolve("../index")];
    setTimeout(done, 20);
  });

  before(function (done) {
    require("../index").init({
      appName: "the-app",
      writeInterval: 30000
    });
    setTimeout(done, 50);
  });

  it("should respond with metrics right after having been initialized", function (done) {
    request("http://localhost:9090")
      .get("/_metrics")
      .expect(200)
      .expect(/nodejs_num_workers{app=\"the-app\"} 1/)
      .end(done);
  });
});