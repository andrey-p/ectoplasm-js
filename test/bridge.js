"use strict";

var should = require("should"),
  async = require("async"),
  bridge = require("../lib/bridge"),
  helper = require("./helper");

describe("bridge", function () {
  // clean up in case a test fails
  after(function (done) {
    helper.killProcess("phantomjs", done);
  });

  describe("#initialise()", function () {
    afterEach(function (done) {
      helper.killProcess("phantomjs", done);
    });

    it("should get a phantom process going", function (done) {
      bridge.initialise(function () {
        helper.checkIfProcessExists("phantomjs", function (err, exists) {
          should.not.exist(err);
          exists.should.equal(true, "phantom process should exist");
          done();
        });
      });
    });
  });
  describe("#cleanup()", function () {
    beforeEach(bridge.initialise);

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
  describe("#call()", function () {
    beforeEach(bridge.initialise);
    afterEach(bridge.cleanup);

    function ping(msg, callback) {
      bridge.call("ping", {
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
});
