/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
(function() {
"use strict";    
    
/**********************************************************************************
 * 
 * Adobe Campaign Classic Core SDK
 * 
 *********************************************************************************/

const pjson = require('../package.json');
const DomUtil = require('./domUtil.js').DomUtil;
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const { Client, Credentials, ConnectionParameters } = require('./client.js');
const request = require('./transport.js').request;
const { TestUtil } = require('./testUtil.js');
const { HttpError } = require('./transport.js');

/**
 * Get/Set the transport function (defaults to Axios). This function is used for testing / mocking the transport layer.
 * Called without arguments, it returns the current transport function
 * Called with an argument, it sets the current transport function and returns the previous one
 * 
 * const t = jest.fn();
 * const old = sdk._transport(t);
 * try {
 *   t.mockReturnValueOnce(Promise.resolve(...);
 *   ... call sdk function which uses the transport layer, for instance ip()
 * } finally {
 *   sdk._transport(old);
 * }
 */

var transport = request;

/**
 * @namespace Campaign
 */
class SDK {

    constructor() {
    }

    _transport(t) {
        if (t) {
            const old = transport;
            transport = t;
            return old;
        }
        return transport;
    }
    
    /**
     * Returns a Client interface which allows you to logon on to an ACC instance and call SOAP methods
     *
     * @memberof Campaign
     * @param {ConnectionParameters} connectionParameters. Use ConnectionParameters.ofUserAndPassword for example
     * @return {Promise<Client>} an ACC client object
     */
    async init (connectionParameters) {
        const client = new Client(this, connectionParameters);
        return client;
    }

    /**
     * @typedef {Object} SDKVersion
     * @property {string} version - the version of the SDK (example: "1.0.0")
     * @property {string} name - the name of the npm package ("@adobe/acc-js-sdk")
     * @property {string} description - the version of the SDK (example: "ACC JavaScript SDK")
     * @memberOf Campaign
     */

    /**
     * Get client SDK version
     * @memberof Campaign
     * @returns {Campaign.SDKVersion} an object containing information about the SDK, such as it's name, version, etc.
     */
    getSDKVersion() {
        return {
            version: pjson.version,
            name: pjson.name,
            description: pjson.description
        };
    }

    /**
     * Get the outbound IP address (https://api.db-ip.com/v2/free/self)
     * Can be useful to troubleshoot IP whitelisting issues
     */
    async ip() {
        const transport = this._transport();
        const ip = await transport({ url: "https://api.db-ip.com/v2/free/self" });
        return ip;
    }

    /** 
     * Escapes and quotes string contained in Xtk expressions. It's common to build xtk expressions such as "@name='Hello'". If 'Hello' is a variable, it's
     * tempting to write "@name='" + hello + "'", or `@name='${hello}'`. The issue is that if the hello variable contains characters such as a
     * simple quote, there can be security concerns (xtk injections). The escapeXtk function ensure proper escaping in this case. In addition, it will also
     * surround the string with quotes, so you can write `@name=${escapeXtk(hello)}`.
     * <p>
     * There are 2 alternate signatures for this function
     * <ul>
     * <li> the first one takes one single parameter which is a string and returns the escaped, quoted string
     * <li> the second one takes 2 array of strings and is called when using the function in tagged string literals. The first array is the constant parts
     *   of the string literal, and the second array contains the variable parts. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
     * </ul>
     * <p>
     * The function can be used in a tagged string literals like this: "var expr = escapeXtk`@name=${hello}`"
     * <p>
     * @memberof Campaign
     * @param {string|string[]} p1 is the text to escape. If the text is null or undefined, it will be handled as an empty string. when using the escapeXtk for a tagged string literal, this parameter is the array of constant values in the template.
     * @param {undefined|string[]} p2 when using the escapeXtk for a tagged string literal, this parameter is the array of expression values in the template.
     * @returns {string} the escaped and quoted (simple quotes) text.
     * 
     * @example
     * expect(sdk.escapeXtk("Rock 'n' Roll")).toBe("'Rock \\'n\\' Roll'");
     * 
     * @example
     * expect(sdk.escapeXtk`@name=${"Rock 'n' Roll"}`).toBe("@name='Rock \\'n\\' Roll'");
     */
    escapeXtk(p1, ...p2) {
        // first syntax: only one parameter which is a string => returns the escaped string.
        // that's how the Campaign function in common.js behaves
        if (p1 === undefined || p1 === null)
            return "''";
        if (typeof p1 === 'string') {
            return "'" + String(p1).replace(/\\/g, "\\\\").replace(/'/g,  "\\'") + "'";
        }

        // Second syntax: for use in tagged template literals
        // instead of writing:  { expr: "@name = " + escapeXtk(userName) }
        // you write { expr: escapeXtk`@name = {userName}` }
        if (p1.length == 0) return "''";
        var str = p1[0];
        for (var i=1; i<p1.length; i++) {
            str = str + this.escapeXtk(p2[i-1]) + p1[i];
        }
        return str;
    }

    /**
     * Escapes a string of characters so that in can be used in a SQL like statement.
     * @param {string | any} text the text to escape. If not a string, it will be casted to a xtk string first
     * @param {boolean?} escapeXtkParams indicates that the escape text contains Xtk parameters (using $ character)
     * @returns the escaped string
     */
    escapeForLike(text, escapeXtkParams) {
        text = XtkCaster.asString(text);
        if (!text) return "";    
        text = text.replace(/\\/g, "\\\\")
                    .replace(/'/g,  "\\'")
                    .replace(/%/g,  "\\%")
                    .replace(/_/g,  "\\_");
        if (escapeXtkParams)
            text = text.replace(/\$/g, "' + Char('36') + '");
      return text;
    }

    /**
     * Expands an xpath, i.e. enclose it with [..] brackets if necessary
     * @param {string} xpath the xpath
     * @returns {string} the expanded xpath
     */
    expandXPath(xpath) {
        if (!xpath) return xpath;
        if (xpath.startsWith("[") && xpath.endsWith("]"))
            return xpath;
        if (xpath.indexOf('/') === -1 && xpath.indexOf('-') === -1 && xpath.indexOf(':') === -1)
            return xpath;
        return `[${xpath}]`;
    }

    unexpandXPath(xpath) {
        if (!xpath) return xpath;
        if (xpath.startsWith("[") && xpath.endsWith("]"))
            return xpath.substring(1, xpath.length - 1);
        return xpath;
    }

    /**
     * Convert a javascript value into an xtk constant with proper quoting
     * @param {any} value the value to convert
     * @param {string} type the xtk type
     * @returns {string} the text literal which can be used in a Xtk expression or condition
     */
    xtkConstText(value, type) {
        if (!type || type === 'string' || type === 'memo') {
            return sdk.escapeXtk(XtkCaster.asString(value));
        }
        const constText = XtkCaster.asString(XtkCaster.as(value, type));
        if (XtkCaster.isTimeType(type))
            return `#${constText}#`;
        return constText;
    }
}

const sdk = new SDK();
sdk.TestUtil = TestUtil;
sdk.XtkCaster = XtkCaster;
sdk.Credentials = Credentials;
sdk.DomUtil = DomUtil;
sdk.ConnectionParameters = ConnectionParameters;
sdk.HttpError = HttpError;

// Public exports
module.exports = sdk;


})();