"use strict";
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
 * A cache for option values
 * 
 *********************************************************************************/
const XtkCaster = require('./xtkCaster.js').XtkCaster;

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
 * A in-memory cache for xtk option values. Not intended to be used directly,
 * but an internal cache for the Campaign.Client object
 * 
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class OptionCache {
    
    constructor() {
        /**
         * The option values, by option name
         * @private
         * @type {Object<string,Campaign.XtkOption>}
         */
        this._optionsByName = {};
    }

    /**
     * Cache an option and its value
     * 
     * @param {string} name is the option name
     * @param {Array} rawValueAndtype a 2 elements array, whose first element is the raw option value (text serialized) and the second element 
     * is the data type of the option. Such an array is returned by the xtk:session#GetOption method
     */
    cache(name, rawValueAndtype) {
        var value = null;
        var type = 0;
        var rawValue = undefined;
        if (rawValueAndtype && rawValueAndtype[1] != 0) {
            rawValue = rawValueAndtype[0];
            type = rawValueAndtype[1];
            value = XtkCaster.as(rawValue, type);
        }
        this._optionsByName[name] = { value:value, type:type, rawValue:rawValue };
        return value;
    }

    /**
     * Get the value of an option, casted to the option type
     * 
     * @param {string} name the option name
     * @returns {*} the option value
     */
    get(name) {
        const option = this._optionsByName[name];
        return option ? option.value : undefined;
    }

    /**
     * Get an option from the cache, including it's type and value
     * 
     * @param {string} name the option name
     * @returns {Campaign.XtkOption} the option
     */
    getOption(name) {
        const option = this._optionsByName[name];
        return option;
    }

    /**
     * Clears the cache
     */
    clear() {
        this._optionsByName = {};
    }

}


// Public exports
exports.OptionCache = OptionCache;