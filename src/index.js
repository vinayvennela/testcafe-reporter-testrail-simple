const Testrail = require('testrail-js-api');
//TODO Keep Error messages in separate file

module.exports = function () {
    return {
        testResults:              {},
        noColors:                 true,
        TESTRAIL_STATUS_FAIL:     5,
        TESTRAIL_STATUS_SKIPPED:  3,
        TESTRAIL_STATUS_SUCCESS:  1,
        testrail:                 null,
        projectRuns:              {},
        suitesMap:                {},
        screenshotsToCaseIdMap:   {},
        screenshotsToResultIdMap: {},

        reportTaskStart (/* startTime, userAgents, testCount*/) {
            let reqParamsPresent = true;

            if (!process.env.TESTRAIL_HOST) {
                console.error('ERROR:  Expected TESTRAIL_HOST in environment variables');
                reqParamsPresent = false;
            }
            if (!process.env.TESTRAIL_USERNAME) {
                console.error('ERROR:  Expected TESTRAIL_USERNAME in environment variables');
                reqParamsPresent = false;
            }
            if (!process.env.TESTRAIL_APIKEY) {
                console.error('ERROR:  Expected TESTRAIL_APIKEY in environment variables');
                reqParamsPresent = false;
            }

            if (reqParamsPresent)
                this.testrail = new Testrail.TestRail(process.env.TESTRAIL_HOST, process.env.TESTRAIL_USERNAME, process.env.TESTRAIL_APIKEY );
            else {
                console.error('Error. Expected all 3 TESTRAIL_HOST, TESTRAIL_USERNAME, TESTRAIL_APIKEY ' +
                    'in environment variables for the testrail-simple reporter to work');
                // process.exit(1);
            }

        },

        reportFixtureStart (/* name, path */) {
            // Not required for the reporter
        },

        async reportTestStart (name, testMeta) {
            let testRailCaseId = testMeta.testRailCaseId || '';

            if (testRailCaseId) {
                testRailCaseId = testRailCaseId.replace('C', '').trim();

                if (this.testrail) {
                    try {

                        const { 'value': caseInfo } = await this.testrail.getCase(testRailCaseId);

                        // If error is received then throw exception
                        if ('error' in caseInfo)
                            throw new Error(caseInfo['error']);

                        const suiteId = caseInfo.suite_id;

                        let projectId = null;

                        // Optimization to avoid querying testrail multiple times for the same suiteId
                        // If project id is fetched from suite, store it in memory and use further
                        if (!this.suitesMap[suiteId]) {
                            const { 'value': suiteInfo } = await this.testrail.getSuite(suiteId);

                            projectId = suiteInfo.project_id;
                            this.suitesMap[suiteId] = projectId;
                        }
                        else
                            projectId = this.suitesMap[suiteId];


                        this.testResults[name] = {
                            'case_id':    testRailCaseId,
                            'suite_id':   suiteId,
                            'project_id': projectId
                        };
                    }
                    catch (e) {
                        console.error(`Error occurred while fetching the suite and project id .
                \n TestRailException : ${e.message}`);
                    }
                }

            }
            else {
                console.log('Did not find testRailCaseId in the testMeta. ' +
                    'Please add {testRailCaseId: "CXXXXXX"} in this format to the testMeta to ' +
                    'upload results to TestRail');
            }
        },

        reportTestDone (name, testRunInfo) {
            const testStatus = this.getTestStatus(testRunInfo);


            if (this.testResults[name]) {
                this.testResults[name]['status_id'] = testStatus;
                if (testRunInfo.screenshots.length > 0)
                    this.screenshotsToCaseIdMap[this.testResults[name]['case_id']] = this.getScreeshotPaths(testRunInfo);
            }


        },

        async reportTaskDone (/* endTime, passed, warnings */) {
            console.log('********************TESTRAIL-SIMPLE REPORTER********************');
            console.log('Started Publishing results to TestRail');

            if (Object.keys(this.testResults).length > 0) {
                console.log('----> Creating required TestRuns');
                await this.checkNCreateTestRuns();

                console.log('----> Updating test results to Runs');
                await this.updateTestResultsToRuns();

                if (Object.values(this.screenshotsToCaseIdMap).length > 0) {
                    if (!process.env.SKIP_UPLOAD_SCREENSHOTS) {

                        console.log('Uploading screenshots');
                        await this.uploadScreenshots();

                        console.log('Uploading screenshots is complete');
                    }
                    else {
                        console.log('Found screenshots in the executed tests, consider removing the env variable ' +
                            'SKIP_UPLOAD_SCREENSHOTS to upload screenshots to test run results');
                    }
                }
                else
                    console.log('No screenshots found to upload!');

                console.log('Publishing results to TestRail is complete');


            }
            else {
                console.log('Nothing to publish. \nIf this is not expected then' +
                '\nAre your credentials correct?' +
                '\nDoes any of your test cases have a valid testRailCaseId key-value in test META?');
            }

            console.log('****************************************************************');

        },

        getTestStatus (testRunInfo) {
            if (testRunInfo.errs.length)
                return this.TESTRAIL_STATUS_FAIL;
            else if (testRunInfo.skipped)
                return this.TESTRAIL_STATUS_SKIPPED;
            return this.TESTRAIL_STATUS_SUCCESS;
        },
        getScreeshotPaths (testRunInfo) {
            const screenshotsPath = [];

            for (const meta of testRunInfo.screenshots)
                screenshotsPath.push(meta['screenshotPath']);

            return screenshotsPath;
        },

        async createNewTestRun (projectId, suiteId) {
            const data = {
                'suite_id': suiteId,
                'name':     `Test Run for ${new Date()}`
            };

            try {
                const { 'value': runInfo } = await this.testrail.addRun(projectId, data);
                const runId = runInfo.id;

                console.log(`Created new test run with id ${runId} for suiteId ${suiteId} & project id ${projectId}`);
                return runId;
            }
            catch (e) {
                console.log(`Error occurred while creating new test run for project id ${projectId} & suite id ${suiteId} .
                \n TestRailException : ${e.message.error}`);
                return '';
            }

        },

        async checkNCreateTestRuns () {
            for (const results of Object.values(this.testResults)) {
                const projectId = results['project_id'];
                const suiteId = results['suite_id'];
                const caseId = results['case_id'];
                const statusId = results['status_id'];

                // Check if new run is required for this suite/project combo
                if (!this.projectRuns[projectId]) {
                    const runId = await this.createNewTestRun(projectId, suiteId);

                    if (runId) {
                        this.projectRuns[projectId] = {};
                        this.projectRuns[projectId][suiteId] = {
                            'run_id':  runId,
                            'results': []
                        };
                    }

                }
                else if (!this.projectRuns[projectId][suiteId]) {
                    const runId = await this.createNewTestRun(projectId, suiteId);

                    if (runId) {
                        this.projectRuns[projectId][suiteId] = {
                            'run_id':  runId,
                            'results': []
                        };
                    }

                }

                // Add cases to results section only if tests are not skipped
                if (!(statusId === this.TESTRAIL_STATUS_SKIPPED)) {
                    this.projectRuns[projectId][suiteId]['results'].push({
                        'case_id':   caseId,
                        'status_id': statusId
                    });
                }

            }
        },

        async updateTestResultsToRuns () {
            for (const [ projectId, suitesInfo] of Object.entries(this.projectRuns)) {
                console.log(`Adding results for cases for project id ${projectId}`);
                for (const [suiteId, results] of Object.entries(suitesInfo)) {
                    console.log(`Adding results for suite id ${suiteId} and run id ${results['run_id']}`);
                    try {
                        if (results['results'].length > 0) {
                            const casesResults = await this.testrail.addResultsForCases(results['run_id'], results['results']);

                            await this.identifyScreenshotsForResults(casesResults, results);
                        }
                        else
                            console.log('SKIPPED as no tests were run in this suite');
                    }
                    catch (e) {
                        console.log(`Error occurred while adding results for cases of project id  ${projectId}
                        & suite id ${suiteId} run id ${results['run_id']}. \n TestRailException : ${e.message.error}`);
                    }

                }
            }
        },

        async identifyScreenshotsForResults (caseResult, results) {
            for (let i = 0; i < results['results'].length; i++) {
                const caseIdTemp = results['results'][i]['case_id'];

                if (this.screenshotsToCaseIdMap[caseIdTemp])
                    this.screenshotsToResultIdMap[caseResult['value'][i]['id']] = this.screenshotsToCaseIdMap[caseIdTemp];

            }
        },

        async uploadScreenshots () {
            for ( const [resultId, screenshotsPathList] of Object.entries(this.screenshotsToResultIdMap)) {
                for ( const screenshotPath of screenshotsPathList) {
                    try {
                        await this.testrail.addAttachmentToResult(resultId, screenshotPath);
                    }
                    catch (e) {
                        console.log(`Exception occurred while uploading screenshots for result id ${resultId}
                        and screenshot path ${screenshotPath} with exception ${e.error.message}`);
                    }

                }

            }


        }
    };
};
