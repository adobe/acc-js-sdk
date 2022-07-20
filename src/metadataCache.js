/*
Copyright 2022 Adobe. All rights reserved.
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
 * A cache for acc properties values ( build Number, last modified)
 * 
 *********************************************************************************/
const { Cache } = require('./cache.js');


/**
 * @namespace Campaign
 * 
 * @typedef {Metadata} 
 * @property {*} value is the value
 * @property {string} rawValue is the raw value
 * @memberof Campaign
 */


/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class MetadataCache extends Cache {
    
    /**
     * A in-memory cache for properties values. Not intended to be used directly,
     * but an internal cache for the Campaign.Client object
     * 
     * Cached object are made of
     * - the key is the option name
     * - the value is a string
     * 
     * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
     * @param {string} rootKey is an optional root key to use for the storage object
     * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
     */
     constructor(storage, rootKey, ttl) {
        super(storage, rootKey, ttl);
    }

    /**
     * Cache a properties and its value
     * 
     * @param {string} name is the propertie name
     * @param {Array} rawValue one element array
     */
    put(name, rawValue) {
      return super.put(name, { value: rawValue });
    }

    /**
     * Get the value of a propertie
     * 
     * @param {string} name the propertie name
     * @returns {*} the value
     */
    get(name) {
        const option = super.get(name);
        return option ? option.value : undefined;
    }
}


// Public exports
exports.MetadataCache = MetadataCache;

})();