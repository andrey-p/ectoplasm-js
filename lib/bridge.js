"use strict";

var spawn = require("child_process").spawn,
  http = require("http"),
  socketIo = require("socket.io"),
  phantomjs = require("phantomjs"),
  phantomProcess,
  socketServer,
  socketConnection,
  httpServer,
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

exports.initialise = function (callback) {
  /*jslint unparam: true*/
  httpServer = http.createServer(function (req, res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end('<html><head><script src="/socket.io/socket.io.js" type="text/javascript"></script><script type="text/javascript">\n'
      + 'window.onload=function(){\n'
      + 'var socket = new io.connect("http://" + window.location.hostname);\n'
      + 'socket.on("input", function(msg){\n'
      + 'alert(msg);\n'
      + '});\n'
      + 'window.socket = socket;\n'
      + '};\n'
      + '</script></head><body></body></html>');
  }).listen(function () {
    var port = httpServer.address().port;
    socketServer = socketIo.listen(httpServer, { "log level": 1 });

    // fire up phantom
    phantomProcess = spawn(phantomjs.path, [
      __dirname + "/../lib_phantom/bridge.js",
      port
    ]);

    // listen for generic process errors and logs from phantom
    // these should really only be used in exceptional circumstances
    // (if there's an error or something, or for debug logging)
    phantomProcess.stderr.on('data', function (data) {
      return console.error('phantom says:', data.toString());
    });
    phantomProcess.stdout.on('data', function (data) {
      return console.log('phantom says:', data.toString());
    });

    // when the phantom process connects, we keep the same socket
    // throughout the paginatron life cycle
    socketServer.sockets.on("connection", function (socket) {
      socketConnection = socket;
      socketConnection.on("output", function (id, body) {
        getCallbackWithId(id)(null, body);
      });
      socketConnection.on("error", function (id, body) {
        getCallbackWithId(id)(body);
      });
      socketConnection.on("ready", function () {
        callback();
      });
    });

  });
  /*jslint unparam: false*/
};

// each call made through here has its callback stored against a unique id
// which is then passed back via the socket connection above
exports.call = function (method, methodArgs, callback) {
  var args = {
    id: getNextId(),
    method: method,
    args: methodArgs
  };

  callbacks[args.id] = callback;

  socketConnection.emit("input", JSON.stringify(args));
};

exports.cleanup = function (callback) {
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

  callback();
};
