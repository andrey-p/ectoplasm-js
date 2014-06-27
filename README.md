ECTOPLASM
====

This is yet another bridge between NodeJS and PhantomJS.

Why is this needed?
---

[node-phantom](https://github.com/alexscheelmeyer/node-phantom) is all nice and good but the callback system does get a bit clunky, e.g. if you're setting a bunch of properties at the same time.
Plus, it lacks the flexibility you'd get from using PhantomJS direct.

Using PhantomJS on its own is all good and nice but calling `exec` all the time is a faff, and there's a noticeable delay as PhantomJS starts up.
This is annoying if you need to run your scripts multiple times in a row.

**Ectoplasm** tries to hit a happy middle, using node-phantom's sockets method but allowing you to run your own scripts.

Installing
---

`npm install --save ectoplasm`

API
---

### initialise(scripts, callback)

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

Sorry about the British spelling there.

### cleanup(callback)

Kills the Phantom process and stops the internal servers.

### run(scriptName, args, callback)

Runs a script that you've previously loaded, for example:

```javascript
var ecto = require("ectoplasm"),
  scripts = {
    "doThings": "/absolute/path/to/doThings.js"
  };

ecto.initialise(scripts, function (err) {
  ecto.run("doThings", { foo: "bar", function (err, result) {
    // things have been done
  });
});
```

`doThings.js` must expose a single method called `run`:

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

License
---

MIT
