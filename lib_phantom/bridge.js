/*globals document: false, phantom: false*/
var port = phantom.args[0],
  controlPage = require("webpage").create(),
  system = require("system"),
  scriptModules = {
    ping: require("./ping")
  };

/*
 * This uses a websockets method heavily inspired by Alex Scheel Meyer's node-phantom
 * https://github.com/alexscheelmeyer/node-phantom
 *
 * for a bit more explanation as to what's going on
 * see the comments in lib/bridge.js
 */

function output(id, body) {
  "use strict";
  controlPage.evaluate('function(){socket.emit("output",' + id + ','
    + JSON.stringify(body)
    + ');}');
}

function error(id, body) {
  "use strict";
  controlPage.evaluate('function(){socket.emit("error",' + id + ','
    + JSON.stringify(body)
    + ');}');
}

function ready() {
  "use strict";
  controlPage.evaluate('function(){socket.emit("ready");}');
}

controlPage.onAlert = function (msg) {
  "use strict";
  var callArgs,
    id,
    scriptModule;

  if (msg === "exit") {
    phantom.exit();
  }

  callArgs = JSON.parse(msg);

  scriptModule = scriptModules[callArgs.method];
  id = callArgs.id;

  scriptModule.handleArgs(callArgs.args, function (err, response) {
    if (err) {
      error(id, err);
    } else {
      output(id, response);
    }
  });
};

controlPage.onLoadFinished = ready;
controlPage.open('http://127.0.0.1:' + port + '/');
