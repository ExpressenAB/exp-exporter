"use strict";

var _ = require("lodash");

function labelsString(labels) {
  var value = "{";
  var labelKeys = _.keys(labels);
  for (var i = 0; i < labelKeys.length; i++) {
    value += labelKeys[i];
    value += "=\"";
    value += labels[labelKeys[i]];
    value += "\"";
    if (i + 1 < labelKeys.length) {
      value += ",";
    }
  }
  value += "}";
  return value;
}

module.exports = {
  labelsString: labelsString
};