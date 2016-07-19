'use strict';

var async = require('async');
var bunyan = require('bunyan');
var cloudwatchStream = require('bunyan-cloudwatch');
var config = require('config');
var moment = require('moment');
var request = require('request');

var aws = require('./aws');

var exports = module.exports = {
  /* istanbul ignore next */
  logger: function() {
    return bunyan.createLogger({
      name: 'web-monitor',
      streams: [
        {
          level: 'trace',
          stream: process.stdout
        },
        {
          level: 'trace',
          type: 'raw',
          stream: cloudwatchStream({
            logGroupName: config.get('aws.cloudwatch.group'),
            logStreamName: config.get('aws.cloudwatch.stream'),
            cloudWatchLogsOptions: {
              region: config.get('aws.region')
            }
          })
        }
      ]
    });
  },

  allSites: function() {
    var sites = config.get('sites');
    var log = exports.logger();

    async.each(sites, exports.checkSite.bind(exports.checkSite, log), function(err) {
      if (err) {
        log.error('Cannot check all sites', err);
      } else {
        log.info('Successfully checked', sites.length, 'sites');
      }
    });
  },

  checkSite: function(log, site, done) {
    log.info('Checkin site', site.name);

    request.get(site.url, function (err, res, body) {
      if (err) {
        log.error('Cannot retrieve page', site.url, err);
        done(err);
      } else if (res.statusCode != 200) {
        log.info('Got HTTP status code', res.statusCode, 'for page', site.url);
        exports.fail(site, log, done);
      } else if (body.indexOf(site.search) >= 0) {
        log.info('Found search term on page', site.url);
        exports.success(site, log, done);
      } else {
        log.info('Cannot find search term on page', site.url);
        exports.fail(site, log, done);
      }
    });
  },

  success: function(site, log, done) {
    log.info('Site', site, 'is OK');

    aws.fetchCount(config.get('aws.s3.error-count-bucket'),
      site.name, config.get('aws.region'), log)
      .then(function(count) {
        if (count > 0) {
          async.parallel([
              aws.snsMessage.bind(
                aws.snsMessage,
                site.name + ' is back to normal ' + moment().format(config.get('notice.date-format')),
                config.get('aws.sns.alerts-topic'),
                config.get('aws.region'),
                log),
              aws.storeCount.bind(aws.storeCount,
                0,
                config.get('aws.s3.error-count-bucket'),
                site.name,
                config.get('aws.region'),
                log)
            ],
            function(err, res) {
              if (err) {
                log.error('Cannot send reset error count', err);
                done(err);
              } else {
                log.info('Success confirmation message sent');
                done();
              }
            }
          );
        } else {
          // do nothing, in most case we get success after success
          done();
        }
      })
      .catch(function(err) {
        log.error('Cannot get error count for site', site.url, err);
        done(err);
      });
  },

  fail: function(site, log, done) {
    log.info('Site', site, 'failed');

    aws.fetchCount(config.get('aws.s3.error-count-bucket'),
      site.name, config.get('aws.region'), log)
      .then(function(count) {
        if (count <= config.get('notice.max-messages')) {
          async.parallel([
              aws.snsMessage.bind(aws.snsMessage,
                site.name + ' is not working as expected (' + count + ') ' + moment().format(config.get('notice.date-format')),
                config.get('aws.sns.alerts-topic'),
                config.get('aws.region'),
                log),
              aws.storeCount.bind(aws.storeCount,
                count + 1,
                config.get('aws.s3.error-count-bucket'),
                site.name,
                config.get('aws.region'),
                log)
            ],
            function(err, res) {
              if (err) {
                log.error('Cannot increment error count', err);
                done(err);
              } else {
                log.info('Failure notice sent');
                done();
              }
            }
          );
        } else {
          // do nothing, we have already sent enough messages
          done();
        }
      })
      .catch(function(err) {
        log.error('Cannot get error count for site', site.url, err);
        done(err);
      });
  }
};


