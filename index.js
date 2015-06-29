"use strict";
var http = require("http");
function init(app) {
  if (app) {
    app.get("/_metrics", function (req, res) {
      res.send({});
    });
  } else {
    http.createServer(function (req, res) {
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.end();
    }).listen(1442);
  }
}

module.exports = {
  init: init
};