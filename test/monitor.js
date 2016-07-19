'use strict';

var bunyan = require('bunyan');
var request = require('request');
var should = require('should');
var sinon = require('sinon');
var sinonStubPromise = require('sinon-stub-promise');
sinonStubPromise(sinon);

var aws = require('../src/aws');
var monitor = require('../src/monitor')

describe('monitor', function() {
  var sandbox;
  var site = { name: 'site-name', url: 'http://www.testsite.com', search: 'find-me' };
  var error = 'a-bad-error';
  var log = {
    error: sinon.spy(),
    warn: sinon.spy(),
    info: sinon.spy(),
    debug: sinon.spy(),
    trace: sinon.spy()
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('checkSite()', function() {
    it('should get an error', function(done) {
      sandbox.stub(request, 'get').yields(error, null, null);

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        done();
      };

      monitor.checkSite(log, site, cb);
    });

    it('should not get 200 http response', function(done) {
      sandbox.stub(request, 'get').yields(null, { statusCode: 500 }, null);
      sandbox.stub(monitor, 'fail', function(site, log, done) {
        done();
      });

      var cb = function(err, res) {
        should.not.exist(res);
        should.not.exist(err);
        monitor.fail.calledOnce.should.be.true();
        monitor.fail.calledWith(site, log).should.be.true();
        done();
      };

      monitor.checkSite(log, site, cb);
    });

    it('should find search term', function(done) {
      sandbox.stub(request, 'get').yields(null, { statusCode: 200 }, 'this string contains find-me');
      sandbox.stub(monitor, 'success', function(site, log, done) {
        done();
      });

      var cb = function(err, res) {
        should.not.exist(res);
        should.not.exist(err);
        monitor.success.calledOnce.should.be.true();
        monitor.success.calledWith(site, log).should.be.true();
        done();
      };

      monitor.checkSite(log, site, cb);
    });

    it('should not find search term', function(done) {
      sandbox.stub(request, 'get').yields(null, { statusCode: 200 }, 'this string does contains the search term');
      sandbox.stub(monitor, 'fail', function(site, log, done) {
        done();
      });

      var cb = function(err, res) {
        should.not.exist(res);
        should.not.exist(err);
        monitor.fail.calledOnce.should.be.true();
        monitor.fail.calledWith(site, log).should.be.true();
        done();
      };

      monitor.checkSite(log, site, cb);
    });
  });

  describe('success()', function() {
    it('should fail getting error count', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().rejects(error);

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        done();
      };

      monitor.success(site, log, cb);
    });

    it('should get a count of 0', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(0);

      var cb = function(err, res) {
        should.not.exist(err);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        done();
      };

      monitor.success(site, log, cb);
    });

    it('should fail sending SNS message', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done(error);
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done();
      });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.snsMessage.calledOnce.should.be.true();
        done();
      };

      monitor.success(site, log, cb);
    });

    it('should fail storing error count', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done();
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done(error);
      });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.storeCount.calledOnce.should.be.true();
        done();
      };

      monitor.success(site, log, cb);
    });

    it('should get a count of 3', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done();
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done();
      });

      var cb = function(err, res) {
        should.not.exist(err);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.snsMessage.calledOnce.should.be.true();
        aws.storeCount.calledOnce.should.be.true();
        done();
      };

      monitor.success(site, log, cb);
    });
  });

  describe('fail()', function() {
    it('should fail getting error count', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().rejects(error);

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        done();
      };

      monitor.fail(site, log, cb);
    });

    it('should get a count of 10', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(10);

      var cb = function(err, res) {
        should.not.exist(err);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        done();
      };

      monitor.fail(site, log, cb);
    });

    it('should fail sending SNS message', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done(error);
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done();
      });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.snsMessage.calledOnce.should.be.true();
        done();
      };

      monitor.fail(site, log, cb);
    });

    it('should fail storing error count', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done();
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done(error);
      });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.storeCount.calledOnce.should.be.true();
        done();
      };

      monitor.fail(site, log, cb);
    });

    it('should get a count of 3', function(done) {
      sandbox.stub(aws, 'fetchCount').returnsPromise().resolves(3);
      sandbox.stub(aws, 'snsMessage', function(message, topic, region, log, done) {
        done();
      });
      sandbox.stub(aws, 'storeCount', function(counter, bucket, key, region, log, done) {
        done();
      });

      var cb = function(err, res) {
        should.not.exist(err);
        should.not.exist(res);
        aws.fetchCount.calledOnce.should.be.true();
        aws.snsMessage.calledOnce.should.be.true();
        aws.storeCount.calledOnce.should.be.true();
        done();
      };

      monitor.fail(site, log, cb);
    });
  });

});