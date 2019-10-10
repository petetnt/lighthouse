/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const runLighthouseCli = require('./run-lighthouse-cli.js').runLighthouse;
const getAssertionReport = require('./report-assert.js');
const LocalConsole = require('./local-console.js');
const smokeTestDefns = require('./test-definitions/core-tests.js');

/** @typedef {import('./child-process-error.js')} ChildProcessError */

/* eslint-disable no-console */

const CONCURRENT_RUNS = 5;

/**
 * The result of running a Lighthouse test, with the usual results plus buffered
 * stdout and stderr for optional later output.
 * @typedef {object} SmokeResult
 * @property {LH.Result} lhr
 * @property {LH.Artifacts} artifacts
 * @property {string} stdout
 * @property {string} stderr
 */

/** @param {string} str */
function purpleify(str) {
  return `${log.purple}${str}${log.reset}`;
}

/**
 * Logs an error to the console, including stdout and stderr if `err` is a
 * `ChildProcessError`.
 * @param {LocalConsole} localConsole
 * @param {ChildProcessError|Error} err
 */
function logChildProcessError(localConsole, err) {
  localConsole.error(log.redify('Error: ') + err.message);

  if ('stdout' in err && 'stderr' in err) {
    localConsole.adoptLog(err);
  }
}

/**
 * Run Lighthouse in the selected runner. Waits until
 * test is complete to log test output and results.
 * @param {string} smokeTestId
 * @param {string} requestedUrl
 * @param {LH.Config.Json} configJson
 * @param {Smokehouse.ExpectedRunnerResult} expectation
 * @return {Promise<{passed: number, failed: number}>}
 */
async function runSmokeTest(smokeTestId, requestedUrl, configJson, expectation) {
  const localConsole = new LocalConsole();

  localConsole.log(`Doing a run of '${requestedUrl}'...`);
  // TODO(bckenny): select runner?
  // TODO(bckenny): debug?

  let result;
  try {
    result = await runLighthouseCli(requestedUrl, configJson);
  } catch (e) {
    logChildProcessError(localConsole, e);
  }

  // Automatically retry failed test in CI to prevent flakes.
  if (!result && process.env.RETRY_SMOKES || process.env.CI) {
    try {
      localConsole.log('Retrying test...');
      result = await runLighthouseCli(requestedUrl, configJson);
    } catch (e) {
      logChildProcessError(localConsole, e);
    }
  }

  if (result) {
    localConsole.adoptLog(result);
  }

  localConsole.log(`Asserting expected results match those found (${requestedUrl}).`);
  const report = getAssertionReport(result, expectation);
  localConsole.adoptLog(report);

  console.log(`\n${smokeTestId} smoketest result:`);
  process.stdout.write(localConsole.stdout);
  if (/\S/.test(localConsole.stderr)) {
    process.stderr.write(localConsole.stderr);
  }

  return {
    passed: report.passed,
    failed: report.failed,
  };
}

/**
 * Run smokehouse in child processes for the selected smoke tests
 * Display output from each as soon as they finish, but resolve function when ALL are complete
 * @param {Smokehouse.TestDfn} smokeTestDefn
 * @return {Promise<{id: string, passingCount: number, failingCount: number}>}
 */
async function runSmokeTestDefn(smokeTestDefn) {
  const {id, config: configJson} = smokeTestDefn;

  console.log(`${purpleify(id)} smoketest starting…`);

  // Loop sequentially over expectations, comparing against Lighthouse run, and
  // reporting result.
  let passingCount = 0;
  let failingCount = 0;
  // TODO(bckenny): could make these all parallel
  for (const expectation of smokeTestDefn.expectations) {
    const requestedUrl = expectation.lhr.requestedUrl;
    const result = await runSmokeTest(id, requestedUrl, configJson, expectation);

    passingCount += result.passed;
    failingCount += result.failed;
  }

  console.log(`\n${purpleify(id)} smoketest complete.`);
  if (passingCount) {
    console.log(log.greenify(`  ${passingCount} passing`));
  }
  if (failingCount) {
    console.log(log.redify(`  ${failingCount} failing`));
  }
  console.log('\n');

  return {
    id,
    passingCount,
    failingCount,
  };
}

/**
 * @param {Array<Smokehouse.TestDfn>} smokeTestDefns
 * @param {number} concurrencyLimit
 * @return {Promise<Array<{id: string, passingCount: number, failingCount: number}>>}
 */
async function concurrentRun(smokeTestDefns, concurrencyLimit) {
  const promiseSet = new Set();
  const result = [];

  for (const smokeTestDefn of smokeTestDefns) {
    // Wait until concurrencyLimit allows another run.
    while (promiseSet.size >= concurrencyLimit) {
      await Promise.race(promiseSet);
    }

    // TODO(bckenny): inject shared concurrentRun into runSmokeTestDefn.
    const innerPromise = runSmokeTestDefn(smokeTestDefn)
      .finally(() => promiseSet.delete(innerPromise));
    promiseSet.add(innerPromise);
    result.push(innerPromise);
  }

  // TODO(bckenny): use an allSettled polyfill instead
  return Promise.all(result);
}

/**
 * Determine batches of smoketests to run, based on the `requestedIds`.
 * @param {Array<string>} requestedIds
 * @return {Array<Smokehouse.TestDfn>}
 */
function getDefinitionsToRun(requestedIds) {
  let smokes = [];
  // TODO(bckenny): separate usage from filtering
  const usage = `    ${log.dim}yarn smoke ${smokeTestDefns.map(t => t.id).join(' ')}${log.reset}\n`;

  if (requestedIds.length === 0) {
    smokes = [...smokeTestDefns];
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(usage);
  } else {
    smokes = smokeTestDefns.filter(test => requestedIds.includes(test.id));
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const unmatchedIds = requestedIds.filter(requestedId => {
    return !smokeTestDefns.map(t => t.id).includes(requestedId);
  });
  if (unmatchedIds.length) {
    console.log(log.redify(`Smoketests not found for: ${unmatchedIds.join(' ')}`));
    console.log(usage);
  }

  return smokes;
}

/**
 * @param {Array<string>} requestedIds
 * @return {Promise<Array<{id: string, passingCount: number, failingCount: number}>>}
 */
async function runSmokehouse(requestedIds) {
  // TODO(bckenny): make smokeTestDefns injectable
  const smokeTestDefns = getDefinitionsToRun(requestedIds);

  const parallelTests = smokeTestDefns.filter(defn => defn.batch === 'parallel');
  const serialTests = smokeTestDefns.filter(defn => defn.batch === 'serial');

  // If the machine is terribly slow, we'll run all smoketests in succession, not parallel
  const parallelLimit = process.env.APPVEYOR ? 1 : CONCURRENT_RUNS;

  if (parallelTests.length > 0) console.log('running parallel tests');
  const parallelResults = await concurrentRun(parallelTests, parallelLimit);

  if (serialTests.length > 0) console.log('running serial tests');
  const serialResults = await concurrentRun(serialTests, 1);

  return [...parallelResults, ...serialResults];
}

module.exports = {
  runSmokehouse,
};
