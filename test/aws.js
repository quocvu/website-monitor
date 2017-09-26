'use strict';

var AWS = require('aws-sdk');
var should = require('should');
var sinon = require('sinon');

var myaws = require('../src/aws');

describe('aws', function() {
  var sandbox;
  var error = 'a-bad-error';
  var log = {
    error: sinon.spy(),
    warn: sinon.spy(),
    info: sinon.spy(),
    debug: sinon.spy(),
    trace: sinon.spy()
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('snsMessage()', function() {
    it('should return an error', function(done) {
      var publish = sandbox.stub().yields(error, null);
      sandbox.stub(AWS, 'SNS').returns({ publish: publish });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        done();
      };

      myaws.snsMessage('a-message', 'a-topic', 'a-region', log, cb);
    });

    it('should send a message', function(done) {
      var publish = sandbox.stub().yields(null, { MessageId: 123 });
      sandbox.stub(AWS, 'SNS').returns({ publish: publish });

      var cb = function(err, res) {
        res.MessageId.should.be.equal(123);
        should.not.exist(err);
        done();
      };

      myaws.snsMessage('a-message', 'a-topic', 'a-region', log, cb);
    });
  });

  describe('fetchCount()', function() {
    it('should return an error', function(done) {
      var getObject = sandbox.stub().yields(error, null);
      sandbox.stub(AWS, 'S3').returns({ getObject: getObject });

      myaws.fetchCount('a-bucket', 'a-key', 'a-region', log)
        .catch(function(err) {
          err.should.be.equal(error);
          done();
        });
    });

    it('should default to 0', function(done) {
      var getObject = sandbox.stub().yields({ code: 'NoSuchKey' }, null);
      sandbox.stub(AWS, 'S3').returns({ getObject: getObject });

      myaws.fetchCount('a-bucket', 'a-key', 'a-region', log)
        .then(function(count) {
          count.should.be.equal(0);
          done();
        });
    });

    it('should return 7', function(done) {
      var getObject = sandbox.stub().yields(null, { Body: 7 });
      sandbox.stub(AWS, 'S3').returns({ getObject: getObject });

      myaws.fetchCount('a-bucket', 'a-key', 'a-region', log)
        .then(function(count) {
          count.should.be.equal(7);
          done();
        });
    });
  });

  describe('storeCount()', function() {
    it('should return an error', function(done) {
      var putObject = sandbox.stub().yields(error, null);
      sandbox.stub(AWS, 'S3').returns({ putObject: putObject });

      var cb = function(err, res) {
        err.should.be.equal(error);
        should.not.exist(res);
        done();
      };

      myaws.storeCount(7, 'a-bucket', 'a-key', 'a-region', log, cb);
    });

    it('should store the count', function(done) {
      var putObject = sandbox.stub().yields(null, 'some-data');
      sandbox.stub(AWS, 'S3').returns({ putObject: putObject });

      var cb = function(err, res) {
        should.not.exist(res);
        should.not.exist(err);
        done();
      };

      myaws.storeCount(7, 'a-bucket', 'a-key', 'a-region', log, cb);
    });
  });
});