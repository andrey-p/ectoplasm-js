"use strict";

// very simple module that takes a message and returns it
// just to check whether the whole system works
exports.handleArgs = function (args, callback) {
  callback(null, args.message);
};
