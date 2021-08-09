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

function OptionCache() {
    this._optionsByName = {};
}

/**
 * Cache an option and its value
 * @param {string} name is the option name
 */
OptionCache.prototype.cache = function(name, rawValueAndtype) {
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

OptionCache.prototype.get = function(name) {
    const option = this._optionsByName[name];
    return option ? option.value : undefined;
}

OptionCache.prototype.getOption = function(name) {
    const option = this._optionsByName[name];
    return option;
}

OptionCache.prototype.clear = function() {
    this._optionsByName = {};
}

exports.OptionCache = OptionCache;