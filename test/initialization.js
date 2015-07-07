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