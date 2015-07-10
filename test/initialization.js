"use strict";
var expect = require("chai").expect;

describe("init function invoked without an app name", function () {
  after(function () {
    delete require.cache[require.resolve("../index")];
  });

  it("should throw an exception", function () {
    expect(function () {
      require("../index").init({
        writeInterval: 20
      });
    }).to.throw();
  });
});

describe("init function invoked with a base path that doesn't exist", function () {
  after(function () {
    delete require.cache[require.resolve("../index")];
  });

  it("should not throw an exception", function () {
    require("../index").init({
      writeInterval: 20,
      appName: "the-app",
      basePath: "/apa/banan/"
    });
  });
});