/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');

const {runSmokehouse} = require('./smokehouse.js');
const {server, serverForOffline} = require('../fixtures/static-server.js');

/* eslint-disable no-console */

/**
 * Run smokehouse from the command line. Run webservers, smokehouse, then report on failures.
 */
async function cli() {
  server.listen(10200, 'localhost');
  serverForOffline.listen(10503, 'localhost');

  const argv = process.argv.slice(2);

  const smokeResults = await runSmokehouse(argv);

  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => serverForOffline.close(resolve));

  const failingTests = smokeResults.filter(result => result.failingCount > 0);
  if (failingTests.length) {
    const testNames = failingTests.map(t => t.id).join(', ');
    console.error(log.redify(`We have ${failingTests.length} failing smoketests: ${testNames}`));
    process.exit(1);
  }

  process.exit(0);
}

cli().catch(e => {
  console.error(e);
  process.exit(1);
});
