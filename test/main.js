"use strict";

var should = require("should"),
  async = require("async"),
  bridge = require("../lib/main"),
  helper = require("./helper");

describe("main", function () {
  // clean up in case a test fails
  after(function (done) {
    helper.killProcess("phantomjs", done);
  });

  describe("#initialise()", function () {
    afterEach(function (done) {
      helper.killProcess("phantomjs", done);
    });

    it("should get a phantom process going", function (done) {
      bridge.initialise(null, function () {
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

      bridge.initialise(scripts, function (err) {
        should.not.exist(err);
        done();
      });
    });
    it("should fail with a meaningful error if the script doesn't exist", function (done) {
      var scripts = {
        foo: "does/not/exist"
      };

      bridge.initialise(scripts, function (err) {
        should.exist(err);
        err.should.startWith("could not find");
        done();
      });
    });
  });
  describe("#cleanup()", function () {
    beforeEach(function (done) {
      bridge.initialise(null, done);
    });

    it("should not leave a phantom process after running cleanup", function (done) {
      bridge.cleanup(function () {
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
      bridge.initialise(null, done);
    });
    afterEach(bridge.cleanup);

    function ping(msg, callback) {
      bridge.run("ping", {
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
    afterEach(bridge.cleanup);

    it("should be able to load an existing script and execute it", function (done) {
      var scripts = {
        pow: __dirname + "/test_phantom_scripts/pow.js"
      };

      bridge.initialise(scripts, function () {
        var args = {
          number: 2,
          exponent: 3
        };

        bridge.run("pow", args, function (err, result) {
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

      bridge.initialise(scripts, function () {
        var args = {
          thisIs: "wrong"
        };

        bridge.run("pow", args, function (err, result) {
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

      bridge.initialise(scripts, function () {
        var args = {
          number: 2,
          exponent: 3
        };

        bridge.run("doSomething", args, function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
});
