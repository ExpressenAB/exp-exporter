"use strict";
function init(app) {
  app.get("/_metrics", function (req, res) {
    res.send({});
  });
}

module.exports = {
  init: init
};