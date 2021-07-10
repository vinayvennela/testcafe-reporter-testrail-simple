# testcafe-reporter-testrail-simple
[![Build Status](https://travis-ci.org/vinayvennela/testcafe-reporter-testrail-simple.svg)](https://travis-ci.org/vinayvennela/testcafe-reporter-testrail-simple)

This is the **testrail-simple** reporter plugin for [TestCafe](http://devexpress.github.io/testcafe).

<p align="center">
    <img src="https://raw.github.com/vinayvennela/testcafe-reporter-testrail-simple/master/media/preview.png" alt="preview" />
</p>

## Install

```
npm install testcafe-reporter-testrail-simple
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
vvennela (http://n/A)
