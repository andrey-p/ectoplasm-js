"use strict";

var should = require("should"),
  async = require("async"),
  ecto = require("../lib/main"),
  phantomjs = require("phantomjs"),
  helper = require("./helper"),
  opts = { phantomPath: phantomjs.path };

describe("main", function () {
  // clean up in case a test fails
  after(function (done) {
    helper.killProcess("phantomjs", done);
  });

  describe("#initialise()", function () {
    afterEach(function (done) {
      helper.killProcess("phantomjs", function () {
        ecto.cleanup(done);
      });
    });

    it("should get a phantom process going", function (done) {
      ecto.initialise(null, opts, function () {
        helper.checkIfProcessExists("phantomjs", function (err, exists) {
          should.not.exist(err);
          exists.should.equal(true, "phantom process should exist");
          done();
        });
      });
    });
    it("should be able to load scripts", function (done) {
      var scripts = {
        pow: __dirname + "/test_phantom_scripts/pow.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.not.exist(err);
        done();
      });
    });
    it("should fail with a meaningful error if the script doesn't exist", function (done) {
      var scripts = {
        foo: "does/not/exist"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.exist(err);
        err.should.startWith("could not find");
        done();
      });
    });
    it("should fail with a meaningful error if the script doesn't expose the #run() method", function (done) {
      var scripts = {
        wrong: __dirname + "/test_phantom_scripts/wrongScript.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.exist(err);
        err.should.startWith("script wrong does not expose a #run() method");
        done();
      });
    });
    it("should fail with a meaningful error if trying to run a script before initialising", function (done) {
      ecto.run("ping", function (err) {
        should.exist(err);
        err.should.startWith("attempted to run script before initialising");
        done();
      });
    });
    it("should be possible to pass in a path to phantom in an options object", function (done) {
      var scripts = {
        pow: __dirname + "/test_phantom_scripts/pow.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.not.exist(err);
        done();
      });
    });
  });
  describe("#cleanup()", function () {
    beforeEach(function (done) {
      ecto.initialise(null, opts, done);
    });

    it("should not leave a phantom process after running cleanup", function (done) {
      ecto.cleanup(function () {
        helper.checkIfProcessExists("phantomjs", function (err, exists) {
          should.not.exist(err);
          exists.should.equal(false, "phantom process should not exist");
          done();
        });
      });
    });
  });
  describe("#run()", function () {
    beforeEach(function (done) {
      ecto.initialise(null, opts, done);
    });
    afterEach(ecto.cleanup);

    function ping(msg, callback) {
      ecto.run("ping", {
        message: msg
      }, callback);
    }

    it("should be able to call the ping method", function (done) {
      ping("test", function (err, result) {
        should.not.exist(err);
        result.should.equal("test");
        done();
      });
    });
    it("should return a meaningful error when you try and call a script that doesn't exist", function (done) {
      ecto.run("doesNotExist", {}, function (err) {
        should.exist(err);
        err.should.startWith("tried running a script that didn't exist: doesNotExist");
        done();
      });
    });
    it("should be able to make multiple calls at the same time without messing things up", function (done) {
      async.parallel({
        test1: async.apply(ping, "test1"),
        test2: async.apply(ping, "test2"),
        test3: async.apply(ping, "test3")
      }, function (err, result) {
        should.not.exist(err);

        // if ping works properly and each function gets its own callback called
        // the result object should be { test1: "test1", etc }
        Object.keys(result).forEach(function (key) {
          should.exist(result[key]);
          result[key].should.equal(key);
        });

        done();
      });
    });
  });
  describe("#run() with scripts", function () {
    afterEach(ecto.cleanup);

    it("should be able to load an existing script and execute it", function (done) {
      var scripts = {
        pow: __dirname + "/test_phantom_scripts/pow.js"
      };

      ecto.initialise(scripts, opts, function () {
        var args = {
          number: 2,
          exponent: 3
        };

        ecto.run("pow", args, function (err, result) {
          should.not.exist(err);
          result.should.equal(8);
          done();
        });
      });
    });
    it("should return any error that the script returns", function (done) {
      var scripts = {
        pow: __dirname + "/test_phantom_scripts/pow.js"
      };

      ecto.initialise(scripts, opts, function () {
        var args = {
          thisIs: "wrong"
        };

        ecto.run("pow", args, function (err, result) {
          should.exist(err);
          should.not.exist(result);
          err.should.equal("needs to pass a number and exponent");
          done();
        });
      });
    });
    it("shouldn't error out if it tries to run a script that doesn't return a value", function (done) {
      var scripts = {
        doSomething: __dirname + "/test_phantom_scripts/doSomething.js"
      };

      ecto.initialise(scripts, opts, function () {
        var args = {
          number: 2,
          exponent: 3
        };

        ecto.run("doSomething", args, function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
    it("should be able to run scripts with no arguments", function (done) {
      var scripts = {
        noArgs: __dirname + "/test_phantom_scripts/noArgs.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.not.exist(err);
        ecto.run("noArgs", function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
    it("should be able to run scripts with a variable number of arguments", function (done) {
      var scripts = {
        multipleArgs: __dirname + "/test_phantom_scripts/multipleArgs.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.not.exist(err);
        ecto.run("multipleArgs", "arg1", "arg2", function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
    it("should be able to receive multiple return values from scripts", function (done) {
      var scripts = {
        multipleArgs: __dirname + "/test_phantom_scripts/multipleArgs.js"
      };

      ecto.initialise(scripts, opts, function (err) {
        should.not.exist(err);
        ecto.run("multipleArgs", "arg1", "arg2", function (err, arg1, arg2, arg3) {
          should.not.exist(err);
          arg1.should.equal("this");
          arg2.should.equal("runs");
          arg3.should.equal("ok");
          done();
        });
      });
    });
  });
});
