/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensure that HTML elements with both `lang` and `xml:lang`
 * attributes agree on the base language of the page.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that checks if the `xml:lang` language attribute (if it is present) matches the value of the `lang` attribute. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'The `<html>` `[lang]` attribute matches the `[xml:lang]` attribute',
  /** Title of an accesibility audit that checks if the `xml:lang` language attribute (if it is present) matches the value of the `lang` attribute. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'The `<html>` `[lang]` attribute does not match the `[xml:lang]` attribute',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Mismatched language declarations may result in a screen reader announcing the page\'s text incorrectly. [Learn more](https://dequeuniversity.com/rules/axe/3.3/html-xml-lang-mismatch).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class HtmlXmlLangMismatch extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'html-xml-lang-mismatch',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = HtmlXmlLangMismatch;
module.exports.UIStrings = UIStrings;
