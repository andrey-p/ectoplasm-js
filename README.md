ECTOPLASM
====

This is yet another bridge between NodeJS and PhantomJS.

[![Build Status](https://travis-ci.org/andrey-p/ectoplasm-js.svg?branch=master)](https://travis-ci.org/andrey-p/ectoplasm-js)

Why is this needed?
---

[node-phantom](https://github.com/alexscheelmeyer/node-phantom) is all nice and good but the callback system does get a bit clunky, e.g. if you're setting a bunch of properties at the same time.
Plus, it lacks the flexibility you'd get from using PhantomJS direct.

Using PhantomJS on its own is all good and nice but calling `exec` all the time and dealing with `stdout` and `stderr` is a faff, plus there's a noticeable delay every time you fire up PhantomJS.
This is annoying if you need to run your scripts multiple times in a row.

**Ectoplasm** tries to hit a happy middle, using node-phantom's sockets method to manage a continuous Phantom process but allowing you to run your own scripts.

Installing
---

`npm install --save ectoplasm`

API
---

### initialise(scripts, [options], callback) or initialize(scripts, [options], callback)

Pass your script names as an object, for instance:

```javascript
var ecto = require("ectoplasm"),
  scripts = {
    doThings: "/absolute/path/to/doThings.js"
  };

ecto.initialise(scripts, function (err) {
  // err is populated if it can't find the scripts
});
```

`options` is an object. The options supported for the moment are `phantomPath` and `debug`.

#### phantomPath

Set this if your PhantomJS binary is not in your `$PATH`:

For instance, if you're using the excellent [phantomjs](https://www.npmjs.org/package/phantomjs) module, you'd do:

```javascript
var ecto = require("ectoplasm"),
  phantomjs = require("phantomjs"),
  scripts = {
    doThings: "/absolute/path/to/doThings.js"
  };

ecto.initialise(scripts, { phantomPath: phantomjs.path }, function (err) {
  // ...
});
```

#### debug

Set this to `true` for detailed debugging information. It also enables tracing of all console messages from the Phantom process.

### cleanup(callback)

Kills the Phantom process and stops the internal servers.

### run(scriptName, [args ...], callback)

Runs a script that you've previously loaded, for example:

```javascript
var ecto = require("ectoplasm"),
  scripts = {
    "doThings": "/absolute/path/to/doThings.js"
  };

ecto.initialise(scripts, function (err) {
  ecto.run("doThings", { foo: "bar" }, function (err, result) {
    // things have been done
  });
});
```

`args` is optional, and you can have as many of them as you want (or none at all) between your script name and callback.

**NOTE**: `args` is serialized to JSON as it's passed to the Phantom side. Be wary of trying to pass values that can't be serialized. For example:

```javascript
var args = {
  foo: "bar",
  baz: function () { return "Hello!"; }
};

// the frontend will only receive { foo: "bar" }
```

Scripts
---

Your script must expose a single method called `run`, for example:

```javascript
// inside doThings.js
exports.run = function (args, callback) {
  if (args.foo === "bar") {
    callback(null, "yay!");
  } else {
    callback("error!");
  }
};
```

You can pass any number of arguments back in your script.

Two scripts are already made available:

- `ping` simply returns your args back to you - in case you want to test things.
- `addScripts` adds scripts at runtime, much like `initialise`:

```javascript
ecto.run("addScripts", {
  doSomethingElse: "/absolute/path/to/doSomethingElse.js"
}, function (err) {
  // you can now run doSomethingElse, too
});
```

License
---

MIT
