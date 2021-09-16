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
 * Helper class to cast values to and from their Xtk versions
 * 
 *********************************************************************************/
 const { CampaignException } = require('./campaign.js');

/**
 * @namespace Campaign
 */

/**
 * Campaign XTK types
 * 
 * 
 * Campaign uses a typed system with some specificities:
 * for strings, "", null, or undefined are equivalent
 * numerical values cannot be null or undefined (0 is used instead)
 * boolean values cannot be null or undefined (false is used instead)
 * conversion between types is automatic based on their ISO representation


|     Xtk type |    | JS type | Comment |
| ------------ |----|-------- | --- |
|       string |  6 |  string | never null, defaults to "" |
|         memo | 12 |  string |
|        CDATA | 13 |  string |
|         byte |  1 |  number | signed integer in the [-128, 128[ range. Never null, defaults to 0 |
|        short |  2 |  number | signed 16 bits integer in the [-32768, 32768[ range. Never null, defaults to 0 |
|         long |  3 |  number | signed 32 bits integer. Never null, defaults to 0 |
|        int64 |    | string  | signed 64 bits integer. As JavaScript handles all numbers as doubles, it's not possible to properly represent an int64 as a number, and it's therefore represented as a string.
|        float |  4 |  number | single-percision numeric value. Never null, defaults to 0 |
|       double |  5 |  number | single-percision numeric value. Never null, defaults to 0 |
|     datetime |  7 |    Date | UTC timestamp with second precision. Can be null |
|   datetimetz |    |         | |
| datetimenotz |    |         | |
|         date | 10 |    Date | UTC timestamp with day precision. Can be null |
|      boolean | 15 | boolean | boolean value, defaultint to false. Cannot be null |
|     timespan |    |         | |

 * @typedef {(0|''|6|'string'|'int64'|12|13|'memo'|'CDATA'|1|'byte'|2|'short'|3|'long'|15|'boolean'|4|5|'float'|'double'|7|'datetime'|'datetimetz'|'datetimenotz'|10|'date')} XtkType
 * @memberof Campaign
 */

/**
 * Helpers to convert between JavaScript data types and Campaign XTK data types
 * 
 * @memberof Campaign
 * @class
 * @constructor
 */
class XtkCaster {
    
    constructor() {
    }

    /**
     * Returns the name of a schema attribute used to store variant value types. The name of the attribute depends on the type: stringValue, longValue, etc.
     * 
     * @private
     * @param {Campaign.XtkType} type the XTK type, either as a string or number (6=string)
     * @returns {string} the attribute name: "stringValue", etc.
     */
    // See "variant" element in xtk:common srcSchema
    static _variantStorageAttribute(type) {
        if (type === null || type === undefined) return null;
        switch(type) {
            case 0:             // FIELD_NONE
            case "":
                return null;
            case 6:             // FIELD_SZ
            case "string":
            case "int64":
                return "stringValue";
            case 12:            // FIELD_MEMO
            case 13:            // FIELD_MEMOSHORT
            case "memo":
            case "CDATA": 
                    return "memoValue";
            case 1:             // FIELD_BYTE
            case "byte":
            case 2:             // FIELD_SHORT
            case "short": 
            case 3:             // FIELD_LONG
            case "long":
            case 15:            // FIELD_BOOLEAN
            case "boolean":
                    return "longValue";
            case 4:             // FIELD_FLOAT
            case 5:             // FIELD_DOUBLE
            case "float":
            case "double":
                return "doubleValue";
            case 7:             // FIELD_DATETIME
            case "datetime": 
            case "datetimetz": 
            case "datetimenotz": 
            case 10:            // FIELD_DATE
            case "date": 
                return "timeStampValue"
            default: {
                throw CampaignException.BAD_PARAMETER("type", type, `Cannot get variant storage attribute name for type '${type}'`);
            }
        }
    }

    /**
     * Cast a value to a given type
     * 
     * @param {*} value the value to case
     * @param {Campaign.XtkType} type the type to cast to:  "string" = 6, "long" = 3, "double" = 5, "datetime" = 7, "memo" = 12
     * @returns {*} the value casted to the requested type, following XTK rules
     */
    static as(value, type) {
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
            case "int64": {
                return this.asInt64(value);
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
                throw CampaignException.BAD_PARAMETER("type", type, `Cannot convert value type='${type}', value='${value}'`);
            }
        }
    }

    /**
     * Convert a raw value into a string
     * 
     * @param {*} value is the raw value to convert
     * @return {string} a string value, guaranteed to be valid
     */
    static asString(value) {
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
     * 
     * @param {*} value is the raw value to convert
     * @param {boolean} is the default to return in case the passed value is null or undefined. Defaults to false
     * @return {boolean} a boolean value, guaranteed to be true or false
     */
    static asBoolean(value, defaultValue) {
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
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid and in the [-128, 127] range
     */
     static asByte(value) {
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
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid and in the [-32768, 32767] range
     */
    static asShort(value) {
        var number = this.asNumber(value);
        if( number ) {
            number = Math.round(number);
            if( number < -32768) number = -32768;
            if( number > 32767) number = 32767;
        }
        return number;
    }

    /**
     * Convert a raw value into a non-null 32 bits number (XTK long) in the [-2147483648, 2147483647] range
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid and in the [-2147483648, 2147483647] range
     */
    static asLong(value) {
        var number = this.asNumber(value);
        if( number ) {
            number = Math.round(number);
            if( number < -2147483648) number = -2147483648;
            if( number > 2147483647) number = 2147483647;
        }
        return number;
    }

    /**
     * Convert a raw value into a non-null int64 number. As JavaScript does not have support
     * for int64, this is actually represented as a string
     * 
     * @param {*} value is the raw value to convert
     * @return {string} a string value representing the number
     */
    static asInt64(value) {
        if (value === null || value === undefined || value === "") return "0";
        if (isNaN(value) || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) return "0";
        if ((typeof value) == "object") return "0";
        if ((typeof value) == "boolean") return value ? "1" : "0";
        var number = String(value).trim();
        if (number.indexOf(".") != -1) return "0";
        if (number == "") return "0";
        return number;
    }

    /**
     * Convert a raw value into a non-null float number
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid
     */
    static asFloat(value) {
        return this.asNumber(value);
    }

    /**
     * Convert a raw value into a non-null double number
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid
     */
    static asDouble(value) {
        return this.asNumber(value);
    }

    /**
     * Convert a raw value into a non-null number
     * 
     * @param {*} value is the raw value to convert
     * @return {number} a numercial value, guaranteed to be valid
     */
    static asNumber(value) {
        if (value === null || value === undefined || value === "") return 0;
        if (isNaN(value) || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) return 0;
        if ((typeof value) == "object") return 0;
        var number = +value;
        return number;
    }

    /**
     * Convert a raw value into a timestamp
     * 
     * @param {*} value is the raw value to convert
     * @return {Date} the timestamp, possibly null
     */
    static asTimestamp(value) {
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
     * Convert a raw value into a  date. This is a UTC timestamp where time fields are 0
     *
     * @param {*} value is the raw value to convert
     * @return {Date} a date
     */
    static asDate(value) {
        var timestamp = this.asTimestamp(value);
        if (timestamp) {
            timestamp.setUTCHours(0);
            timestamp.setUTCMinutes(0);
            timestamp.setUTCSeconds(0);
            timestamp.setUTCMilliseconds(0);
        }
        return timestamp;
    }
}

exports.XtkCaster = XtkCaster;
