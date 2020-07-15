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
 * @param {boolean} rememberMe 
 * @return {Promise<Client>}
 */
async function init (endpoint, user, password, rememberMe) {
    const client = new Client(endpoint, user, password, rememberMe);
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


module.exports = {
    init: init,
    getSDKVersion: getSDKVersion,
    XtkCaster: XtkCaster,
    DomUtil: DomUtil
};

