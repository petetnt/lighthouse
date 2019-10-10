/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * A simple buffered log to use in place of stdout or console.
 */
class LocalConsole {
  constructor() {
    this.stdout = '';
    this.stderr = '';
  }

  /**
   * @param {string} str
   */
  log(str) {
    this.stdout += str + '\n';
  }

  /**
   * @param {string} str
   */
  error(str) {
    this.stderr += str + '\n';
  }

  /**
   * Append another log's stdout and stderr to the ones in this log.
   * @param {{stdout: string, stderr: string}} otherLog
   */
  adoptLog(otherLog) {
    // Don't add extra whitespace.
    this.stdout += otherLog.stdout;
    this.stderr += otherLog.stderr;
  }
}

module.exports = LocalConsole;
