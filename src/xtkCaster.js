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
 * Helper class to cast values to and from their Xtk versions
 * 
 *********************************************************************************/

function XtkCaster() {
}

/**
 * Cast with given type
 * @param {*} value 
 * @param {*} type      // See FIELD_xxx constants in cvariant.h - "string" = 6, "long" = 3, "double" = 5, "datetime" = 7, "memo" = 12
 */
XtkCaster.prototype.as = function(value, type) {
    switch(type) {
        case 0:             // FIELD_NONE
        case "": {
            return value;
        }
        case 6:             // FIELD_SZ
        case 12:            // FIELD_MEMO
        case 13:            // FIELD_MEMOSHORT
        case "string":
        case "memo":
        case "CDATA": {
            return this.asString(value);
        }
        case 1:             // FIELD_BYTE
        case "byte": {
            return this.asByte(value);
        }
        case 2:             // FIELD_SHORT
        case "short": {
            return this.asShort(value);
        }
        case 3:             // FIELD_LONG
        case "long": {
            return this.asLong(value);
        }
        case 4:             // FIELD_FLOAT
        case 5:             // FIELD_DOUBLE
        case "float":
        case "double": {
            return this.asNumber(value);
        }
        case 15:            // FIELD_BOOLEAN
        case "boolean": {
            return this.asBoolean(value);
        }
        case 7:             // FIELD_DATETIME
        case "datetime": 
        case "datetimetz": 
        case "datetimenotz": {
            return this.asTimestamp(value);
        }
        case 10:            // FIELD_DATE
        case "date": {
            return this.asDate(value);
        }
        default: {
            throw new Error("Cannot convert value type='" + type + "', value=" + value);
        }
    }
}

/**
 * Convert a raw value into a string
 * @param {*} value is the raw value to convert
 * @return a string value, guaranteed to be valid
 */
XtkCaster.prototype.asString = function(value) {
    if (value === null || value === undefined) return "";
    if (value != value || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) return "";
    if (value instanceof Date) {
        if (isNaN(value.getTime()))
            return "";  // Invalid JavaScript date
        return value.toISOString();
    }
    if ((typeof value) == "object") return "";
    return value.toString();
}

/**
 * Convert a raw value into a true/false boolean
 * @param {*} value is the raw value to convert
 * @param {boolean} is the default to return in case the passed value is null or undefined. Defaults to false
 * @return a boolean value, guaranteed to be true or false
 */
XtkCaster.prototype.asBoolean = function(value, defaultValue) {
    if (defaultValue === undefined) defaultValue = false;
    if (value === null || value === undefined) return defaultValue;
    if (value === true || value === false) return value;
    var stringValue = value.toString().toLowerCase().trim();
    if (stringValue === "false" || stringValue === "") return false;
    if (stringValue === "true") return true;
    var intValue = parseInt(value, 10);
    if (isNaN(intValue)) return false;
    return intValue !== 0;
}

/**
 * Convert a raw value into a non-null byte number in the [-128, 127] range
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid and in the [-128, 127] range
 */
XtkCaster.prototype.asByte = function(value) {
    var number = this.asNumber(value);
    if( number ) {
        number = Math.round(number);
        if( number < -128) number = -128;
        if( number > 127) number = 127;
    }
    return number;
}

/**
 * Convert a raw value into a non-null short number in the [-32768, 32767] range
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid and in the [-32768, 32767] range
 */
XtkCaster.prototype.asShort = function(value) {
    var number = this.asNumber(value);
    if( number ) {
        number = Math.round(number);
        if( number < -32768) number = -32768;
        if( number > 32767) number = 32767;
    }
    return number;
}

/**
 * Convert a raw value into a non-null long number in the [-2147483648, 2147483647] range
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid and in the [-2147483648, 2147483647] range
 */
XtkCaster.prototype.asLong = function(value) {
    var number = this.asNumber(value);
    if( number ) {
        number = Math.round(number);
        if( number < -2147483648) number = -2147483648;
        if( number > 2147483647) number = 2147483647;
    }
    return number;
}

/**
 * Convert a raw value into a non-null float number
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid
 */
XtkCaster.prototype.asFloat = function(value) {
    return this.asNumber(value);
}

/**
 * Convert a raw value into a non-null double number
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid
 */
XtkCaster.prototype.asDouble = function(value) {
    return this.asNumber(value);
}

/**
 * Convert a raw value into a non-null number
 * @param {*} value is the raw value to convert
 * @return a numercial value, guaranteed to be valid
 */
XtkCaster.prototype.asNumber = function(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (isNaN(value) || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) return 0;
    if ((typeof value) == "object") return 0;
    var number = +value;
    return number;
}

/**
 * Convert a raw value into a timestamp
 * @param {*} value is the raw value to convert
 * @return the timestamp, possibly null
 */
XtkCaster.prototype.asTimestamp = function(value) {
    if (value === null || value === undefined) return null;
    if ((typeof value) == "string") value = value.trim();
    if (value === "" || value === true || value === false) return null;
    if (value !== value || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) return null;

    var timestamp = null;
    if (value instanceof Date)
        timestamp = value;
    // Number to timestamp -> Consider as number of seconds since epoch
    else if ((typeof value) == "number") {
        timestamp = new Date(0);
        timestamp.setUTCSeconds(value);
    }
    else {
        var number = +value;
        if (number === number){
            timestamp = new Date(0);
            timestamp.setUTCSeconds(value);
        }
        // Parse ISO string. Example: "2018-11-18 01:00:04.690Z"
        else if ((typeof value) == "string") {
            timestamp = new Date(value);
        }
    }
    if (!timestamp || isNaN(timestamp.getTime())) return null;
    return timestamp;
}

/**
 * Convert a raw value into a (moment) date. This is a moment UTC timestamp where time fields are 0
 * @param {*} value is the raw value to convert
 * @return a moment timestamp, possibly null
 */
XtkCaster.prototype.asDate = function(value) {
    var timestamp = this.asTimestamp(value);
    if (timestamp) {
        timestamp.setUTCHours(0);
        timestamp.setUTCMinutes(0);
        timestamp.setUTCSeconds(0);
        timestamp.setUTCMilliseconds(0);
    }
    return timestamp;
}

exports.XtkCaster = new XtkCaster();
