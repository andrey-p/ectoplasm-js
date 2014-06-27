/*globals document: false, phantom: false*/
"use strict";

var port = phantom.args[0],
  controlPage = require("webpage").create(),
  system = require("system"),
  addScriptsScript = {},
  scripts = {
    ping: require("./ping"),
    addScripts: addScriptsScript
  };

/*
 * This uses a websockets method heavily inspired by Alex Scheel Meyer's node-phantom
 * https://github.com/alexscheelmeyer/node-phantom
 *
 * for a bit more explanation as to what's going on
 * see the comments in lib/bridge.js
 */

function emit(eventName, id, body) {
  var js = "function () { socket.emit(\"" + eventName + "\"";

  if (id && body) {
    js += ", " + id + ", " + JSON.stringify(body);
  }

  js += ");}";

  controlPage.evaluate(js);
}

controlPage.onAlert = function (msg) {
  var callArgs,
    id,
    script;

  if (msg === "exit") {
    phantom.exit();
  }

  callArgs = JSON.parse(msg);

  script = scripts[callArgs.method];
  id = callArgs.id;

  script.run(callArgs.args, function (err, output) {
    if (err) {
      emit("error", id, err);
    } else {
      emit("output", id, output);
    }
  });
};

addScriptsScript.run = function (args, callback) {
  Object.keys(args).forEach(function (scriptName) {
    scripts[scriptName] = require(args[scriptName]);
  });

  callback(null, "hello");
};

controlPage.onLoadFinished = function () {
  emit("ready");
};

controlPage.open('http://127.0.0.1:' + port + '/');
