# testcafe-reporter-testrail-simple
[![Build Status](https://travis-ci.org/vinayvennela/testcafe-reporter-testrail-simple.svg)](https://travis-ci.org/vinayvennela/testcafe-reporter-testrail-simple)

This is the **testrail-simple** reporter plugin for [TestCafe](http://devexpress.github.io/testcafe).

Update v1.1.1: The reporter now supports uploading screenshots to as well

This reporter needs only 3 configuration parameters TestRail host, username and password
and does the required back tracing to collect information like project id, suite id etc that are required to
publish the Test Run results to TestRail.

No need to rename/ append the TestRailCase ids into the test case name, just add the tag {testRailCaseId: CXXXXX} in the test meta and reporter will picks up the info.

Easy and Clean!

Did i say the reporter name is testrail-simple? Guess it should be testrail-very-simple LOL!!!


<p align="center">
    <img src="https://raw.github.com/vinayvennela/testcafe-reporter-testrail-simple/master/media/preview.png" alt="preview" />
</p>

## Install

```
npm install testcafe-reporter-testrail-simple
```

## Configuration

- TestCases should have the TestRail case ids present in the test meta in the format
{testRailCaseId: 'C12345'}
```
test.meta({testRailCaseId: 'C239234'})
```
- The reporter requires 3 environment variables to be present
```
TESTRAIL_HOST: https://vinay.testrail.com
TESTRAIL_USERNAME: username
TESTRAIL_APIKEY: password or api key
```

## Usage

When you run tests from the command line, specify the reporter name by using the `--reporter` option:

```
testcafe chrome 'path/to/test/file.js' --reporter testrail-simple
```


When you use API, pass the reporter name to the `reporter()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('chrome')
    .reporter('testrail-simple') // <-
    .run();
```

## Author
vinayvennela
