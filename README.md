[![Build Status](https://travis-ci.org/quocvu/website-monitor.svg?branch=master)](http://img.shields.io/travis/quocvu/website-monitor.svg)
[![Coverage Status](https://coveralls.io/repos/github/quocvu/website-monitor/badge.svg?branch=master)](https://img.shields.io/coveralls/quocvu/website-monitorl.svg)

# website-monitor

Monitor website pages and send SMS if the page is not available.

This is a simple example showing how to schedule a Lambda function to run periodically,
to perform a pulse check of a list of web pages.  It broadcasts the status to a SNS topic
which contains a SMS subcription with your mobile phone number.

# Setup

Get the source code

    $ git clone git@github.com:quocvu/website-monitor.git

Download the dependencies

    $ cd website-mointor
    $ npm install

Although we have not yet configured our Lambda function with the correct parameters,
we need to package it so that our Cloud Formation tempate can reference it to create
the needed AWS resource.  We will update the lambda function package later. For now,
we just need to create a package and upload to s3 to bootstrap things.  This command creates the zip
archive.

    $ npm run zip
    $ aws s3 cp webmonitor.zip s3://my-lambda-functions/webmonitor.zip

Now let's standup all needed AWS resources with our Cloud Formation template. Make
a copy of the parameter files, edit it to provide the correct values for `SourceBucket`
(the S3 bucket containing the Lambda function package), `SourceKey` (the S3 key of
the Lambda function package), `PhoneNumber` receiving SMS monitoring alerts. Then run
the CFN template.

   $ cp cfn/params-example.json cfn/params.json
   $ vi cfn/params.json
   $ npm run aws-stack WebMonitorStack1

Once the CFN completes, look at its output, we are going to use these value to
configure our Lambda function.

Make a copy of the config file, edit it, using the values from the output of the CFN.  Check
the section below for each value of the config file.

    $ cp config/default-example.json config/default.json
    $ vi config/default.json

Once configured correctly, we make a new package of our Lambda function and redeploy it.

    $ npm run zip
    $ npm run deploy -- --function-name WebMonitorStack1-MonitorFunction-160xxxxxxO5A7 --role arn:aws:iam::658xxxxxx124:role/WebMonitorStack1-MonitorRole-1UBxxxxxxZJU

Now, relax, you will be notified by SMS when your website goes down. Just make sure you have
your mobile phone with you all time.


# Config File

* `aws.region`: the AWS region to deploy your aws stack
* `aws.sns.alert-topic`: the SNS topic created by the CFN template to send alerts to. It looks like this `arn:aws:sns:<aws-region>:<aws-account-number>:WebMonitorStack1-AlertsTopic-3I9RGSOENPBD2`
* `aws.s3.error-count-bucket`: the S3 bucket created by the CFN template to store error counts.  It looks like this `WebMonitorStack1-errorcountbucket-dwcg8bsc7van`
* `aws.cloudwatch.group`: the Cloudwatch group created by the CFN template to send log of the Lambda function. It looks like this `WebMonitorStack1-LogGroup-HK4MWDCJ2H37`
* `aws.cloudwatch.stream`: the Cloudwatch stream created by the CFN template to send log of the Lambda function. It looks like this `WebMonitorStack1-LogStream-WQSRTE2YKHTJ`
* `sites`: list of websites to monitor
* `sites[i].name`: the display name of the site
* `sites[i].url`: URL of the page to retrieve
* `sites[i].search`: the string to search for on the retrieved page. If the string is found it means everything is okay. Otherwise there is some error.
* `notice.max-messages`: max number of SMS message to send in case of error.  Stop sending beyond this.
* `notice.date-format`: date format used by SMS messages



