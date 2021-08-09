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


/**********************************************************************************
 * 
 * Adobe Campaign Classic Core SDK
 * 
 *********************************************************************************/

'use strict'

const pjson = require('../package.json');
const DomUtil = require('./dom.js').DomUtil;
const XtkCaster = require('./xtkCaster.js').XtkCaster;

const Client = require('./client.js').Client;

/**
 * Returns a Promise that resolves with a new ACC client object.
 *
 * @param {String} endpoint endpoint to connect to, for instance: https://myinstance.campaign.adobe.com
 * @param {String} user user name, for instance admin
 * @param {String} password the user password
 * @param {boolean} options an options object to configure the client
 * @return {Promise<Client>}
 */
async function init (endpoint, user, password, options) {
    const client = new Client(this, endpoint, user, password, options);
    return client;
}

/**
 * Get client SDK version
 */
function getSDKVersion() {
    return {
        version: pjson.version,
        name: pjson.name,
        description: pjson.description
    }
}

/** Escapes string contained in Xtk expressions */
function escapeXtk(p1, ...p2)
{
    // first syntax: only one parameter which is a string => returns the escaped string.
    // that's how the Campaign function in common.js behaves
    if (p1 === undefined || p1 === null)
        return "''";
    if (typeof p1 === 'string') {
        return "'" + String(p1).replace(/\\/g, "\\\\").replace(/'/g,  "\\'") + "'";
    }

    // Second syntax: for use in tagged template litterals
    // instead of writing:  { expr: "@name = " + escapeXtk(userName) }
    // you write { expr: escapeXtk`@name = {userName}` }
    if (p1.length == 0) return "''";
    var str = p1[0];
    for (var i=1; i<p1.length; i++) {
        str = str + escapeXtk(p2[i-1]) + p1[i];
    }
    return str;
}


module.exports = {
    init: init,
    getSDKVersion: getSDKVersion,
    escapeXtk: escapeXtk,
    XtkCaster: XtkCaster,
    DomUtil: DomUtil
};

