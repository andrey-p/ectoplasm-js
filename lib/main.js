"use strict";

var spawn = require("child_process").spawn,
  http = require("http"),
  socketIo = require("socket.io"),
  phantomProcess,
  socketServer,
  socketConnection,
  httpServer,
  initialised = false,
  debug = false,
  callbacks = {},
  nextCallbackId = 0;

/*
 * This uses a websockets method heavily inspired by Alex Scheel Meyer's node-phantom
 * https://github.com/alexscheelmeyer/node-phantom
 */

function getNextId() {
  if (nextCallbackId < Number.MAX_VALUE) {
    nextCallbackId += 1;
  } else {
    nextCallbackId = 1;
  }

  return nextCallbackId;
}

function getCallbackWithId(id) {
  var cb = callbacks[id];
  delete callbacks[id];
  return cb;
}

exports.initialise = exports.initialize = function () {
  var args = Array.prototype.slice.call(arguments),
    callback = args.pop(),
    scripts = args.shift(),
    opts = args[0] || {};

  // default to binary in $PATH
  opts.phantomPath = opts.phantomPath || "phantomjs";

  // default to no debug
  debug = opts.debug || false;

  if (debug) {
    console.log("[Ectoplasm] Firing up server...");
  }

  /*jslint unparam: true*/
  httpServer = http.createServer(function (req, res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end('<html><head><script src="/socket.io/socket.io.js" type="text/javascript"></script><script type="text/javascript">\n'
      + 'window.onload=function(){\n'
      + 'var socket = new io("http://" + window.location.hostname + ":' + httpServer.address().port + '");\n'
      + 'socket.on("input", function(msg){\n'
      + 'alert(msg);\n'
      + '});\n'
      + 'window.socket = socket;\n'
      + '};\n'
      + '</script></head><body></body></html>');
  }).listen(function () {
    var port = httpServer.address().port;
    socketServer = socketIo.listen(httpServer, { "log level": 1 });

    if (debug) {
      console.log("[Ectoplasm] Socket server sorted, waiting for connection...");
    }

    // fire up phantom
    phantomProcess = spawn(opts.phantomPath, [
      __dirname + "/../lib_phantom/bridge.js",
      port
    ]);

    // listen for generic process errors and logs from phantom
    // these should really only be used in exceptional circumstances
    // (if there's an error or something, or for debug logging)
    if (debug) {
      phantomProcess.stderr.on('data', function (data) {
        return console.error('[Ectoplasm] phantom got error:', data.toString());
      });
      phantomProcess.stdout.on('data', function (data) {
        return console.log('[Ectoplasm] phantom says:', data.toString());
      });
    }

    // when the phantom process connects, we keep the same socket
    // throughout the ectoplasm life cycle
    socketServer.sockets.on("connection", function (socket) {
      socketConnection = socket;
      socketConnection.on("output", function (id, args) {
        getCallbackWithId(id).apply(null, args);
      });

      if (debug) {
        console.log("[Ectoplasm] Socket connected!");
      }

      // if we've scripts to load, load them and then callback
      // else callback when socket is ready
      socketConnection.on("ready", function () {
        initialised = true;
        if (scripts) {
          exports.run("addScripts", scripts, opts, callback);
        } else {
          callback();
        }
      });
    });

  });
  /*jslint unparam: false*/
};

// each call made through here has its callback stored against a unique id
// which is then passed back via the socket connection above
exports.run = function () {
  var args = Array.prototype.slice.call(arguments),
    callback = args.pop(),
    scriptArgs = {
      id: getNextId(),
      method: args.shift(),
      args: args
    },
    serialisedArgs = JSON.stringify(scriptArgs);

  if (!initialised) {
    return callback("attempted to run script before initialising");
  }

  callbacks[scriptArgs.id] = callback;

  if (debug) {
    console.log("[Ectoplasm] calling script", scriptArgs.method, "with args:", serialisedArgs);
  }

  socketConnection.emit("input", serialisedArgs);
};

exports.cleanup = function (callback) {
  if (initialised) {
    initialised = false;
    phantomProcess.kill();
    socketConnection.emit("input", "exit");
    socketConnection.removeAllListeners("output");
    phantomProcess.stderr.removeAllListeners("data");
    phantomProcess.stdout.removeAllListeners("data");
    httpServer.close();

    httpServer = null;
    socketServer = null;
    socketConnection = null;
    phantomProcess = null;
  }

  if (callback) {
    callback();
  }
};
