'use strict';

var AWS = require('aws-sdk');

var exports = module.exports = {
  snsMessage: function(message, topic, region, log, done) {
    log.info('Sending SNS', message);

    var sns = new AWS.SNS({ region: region });
    sns.publish({
      TopicArn: topic,
      Subject: message,
      Message: message
    }, function(err, data) {
      if (err) {
        log.error('Error sending a SNS message', err);
        done(err);
      } else {
        log.info('Sent SNS message:', data.MessageId);
        done(null, data);
      }
    });
  },

  fetchCount: function(bucket, key, region, log) {
    log.debug('Read error count from S3', bucket + '/' + key);
    var s3 = new AWS.S3({ region: region });

    return new Promise(function(resolve, reject) {
      s3.getObject({
        Bucket: bucket,
        Key: key
      }, function(err, data) {
        if (err) {
          if (err.code === 'NoSuchKey') {
            log.warn('Error counter does not exist. Default to 0');
            resolve(0);
          } else {
            log.error('Cannot read error count', err);
            reject(err);
          }
        } else {
          var count = parseInt(data.Body.toString(), 10);
          log.debug('Error count is', count);
          resolve(count);
        }
      });
    });
  },

  storeCount: function(counter, bucket, key, region, log, done) {
    log.debug('Write error count to S3', bucket + '/' + key);

    var s3 = new AWS.S3({ region: region });
    s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: counter.toString()
    }, function(err, data) {
      if (err) {
        log.error('Cannot write counter to S3', err);
        done(err);
      } else {
        log.info('Saved error count of', counter, 'to S3', bucket + '/' + key);
        done();
      }
    });
  }
};