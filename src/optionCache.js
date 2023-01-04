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
 * A cache for option values
 * 
 *********************************************************************************/
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const { Cache } = require('./cache.js');


/**
 * @namespace Campaign
 * 
 * @typedef {Option} XtkOption
 * @property {*} value is the option value, casted to the option type
 * @property {string} rawValue is the option raw value, as a string returned by the xtk:session#GetOption method
 * @property {Campaign.XtkType} type is the option type, as a string returned by the xtk:session#GetOption method
 * @memberof Campaign
 */


/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class OptionCache extends Cache {
    
    /**
     * A in-memory cache for xtk option values. Not intended to be used directly,
     * but an internal cache for the Campaign.Client object
     * 
     * Cached object are made of
     * - the key is the option name
     * - the value is the option, a JSON object made of value, type, and rawValue properties
     * 
     * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
     * @param {string} rootKey is an optional root key to use for the storage object
     * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
     */
     constructor(storage, rootKey, ttl) {
        super(storage, rootKey, ttl);
    }

    /**
     * Cache an option and its value
     * For backward compatibility purpose. Use "put" instead
     * 
     * @deprecated
     * @param {string} name is the option name
     * @param {Array} rawValueAndtype a 2 elements array, whose first element is the raw option value (text serialized) and the second element 
     * is the data type of the option. Such an array is returned by the xtk:session#GetOption method
     */
    async cache(schemaId, methodName) {
        return this.put(schemaId, methodName);
    }

    /**
     * Cache an option and its value
     * 
     * @param {string} name is the option name
     * @param {Array} rawValueAndtype a 2 elements array, whose first element is the raw option value (text serialized) and the second element 
     * is the data type of the option. Such an array is returned by the xtk:session#GetOption method
     */
    async put(name, rawValueAndtype) {
        var value = null;
        var type = 0;
        var rawValue;
        if (rawValueAndtype && rawValueAndtype[1] != 0) {
            rawValue = rawValueAndtype[0];
            type = rawValueAndtype[1];
            value = XtkCaster.as(rawValue, type);
        }
        await super.put(name, { value:value, type:type, rawValue:rawValue });
        return value;
    }

    /**
     * Get the value of an option, casted to the option type
     * 
     * @param {string} name the option name
     * @returns {*} the option value
     */
    async get(name) {
        const option = await super.get(name);
        return option ? option.value : undefined;
    }

    /**
     * Get an option from the cache, including it's type and value
     * 
     * @param {string} name the option name
     * @returns {Campaign.XtkOption} the option
     */
    async getOption(name) {
        return await super.get(name);
    }
}


// Public exports
exports.OptionCache = OptionCache;

})();