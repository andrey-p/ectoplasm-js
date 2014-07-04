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

  if (id) {
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

  if (!script) {
    return emit("err", id, "tried running a script that didn't exist: " + callArgs.method);
  }

  // add our own callback as the final argument of the function
  callArgs.args.push(function (err, output) {
    if (err) {
      emit("err", id, err);
    } else {
      emit("output", id, output);
    }
  });

  // we use apply instead of calling directly
  // because we receive args as an array
  script.run.apply(null, callArgs.args);
};

addScriptsScript.run = function (args, callback) {
  var noError = true;
  Object.keys(args).forEach(function (scriptName) {
    try {
      scripts[scriptName] = require(args[scriptName]);
    } catch (e) {
      noError = false;
      callback("could not find script " + scriptName
        + " - tried looking at " + args[scriptName]);
    }

    if (!scripts[scriptName].run) {
      noError = false;
      callback("script " + scriptName + " does not expose a #run() method");
    }
  });

  if (noError) {
    callback();
  }
};

controlPage.onLoadFinished = function () {
  emit("ready");
};

controlPage.open('http://127.0.0.1:' + port + '/');
