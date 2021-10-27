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
 * Generic utilities
 * 
 *********************************************************************************/

/**
 * @namespace Utils
 */

/**
 * @memberof Utils
 * @class
 * @constructor
 */
class Util {

  /**
   * Generic helper functions available everywhere in the SDK. Al functions are static, it is not necessary to create new instances of this object
   */
  constructor() {
  }

  /**
   * Indicates whether the SDK is running in a browser or not
   * @returns {boolean} a boolean indicating if the SDK is running in a browser or not
   */
  static isBrowser() {
    const browser = typeof window !== 'undefined';
    return browser;
  }
  
  /**
   * Tests if an object is a JavaScript array
   * @param {*} obj the object to test, may be undefined
   * @returns {boolean} true if the object is an array
   */
  static isArray(obj) {
    if (obj === null || obj === undefined) return false;
    // JavaScript arrays are objects
    if (typeof obj != "object") return false;
    // They also have a length property. But checking the length is not enough
    // since, it can also be an object litteral with a "length" property. Campaign
    // schema attributes typically have a "length" attribute and are not arrays
    if (obj.length === undefined || obj.length === null) return false;
    // So check for a "push" function
    if (obj.push === undefined || obj.push === null) return false;
    if (typeof obj.push != "function") 
        return false;
    return true;
  }

  // Helper function for trim() to replace text between 2 indices
  static _removeBetween(text, from, to) {
    var index = 0;
    while (index < text.length) {
      index = text.indexOf(from, index);
      if (index == -1) break;
      const index2 = text.indexOf(to, index);
      if (index2 == -1) {
        break;
      }
      text = text.substring(0, index + from.length) + '***' + text.substring(index2);
      index = index2;
    }
    return text;
  }
  
  /**
   * Trims a text, an object or an array and remove sensitive information, such as session tokens, passwords, etc.
   * 
   * @param {string|Object|Array} obj is the object to trim
   * @returns {string|Object|Array} the trimmed object
   */
  static trim(obj) {
    if (obj == null || obj == undefined) return undefined;
    if (Util.isArray(obj)) {
      const a = [];
      for (const p of obj) {
        a.push(Util.trim(p));
      }
      return a;
    }
    if (typeof obj == "object") {
      for (const p in obj) {
        if (p.toLowerCase() === "x-security-token")
          obj[p] = "***";
        else if (p === "Cookie") {
          var index = obj[p].toLowerCase().indexOf("__sessiontoken");
          if (index !== -1) {
            index = obj[p].indexOf("=", index);
            if (index !== -1) {
              index = index + 1;
              const endIndex = obj[p].indexOf(";", index);
              if (endIndex == -1)
                obj[p] = obj[p].substring(0, index) + "***";
              else 
                obj[p] = obj[p].substring(0, index) + "***" + obj[p].substring(endIndex);
            }
          }
        }
        else
          obj[p] = Util.trim(obj[p]);
      }
    }
    if (typeof obj == "string") {
      // Remove trailing blanks
      while (obj && (obj.endsWith(' ') || obj.endsWith('\n') || obj.endsWith('\r') || obj.endsWith('\t')))
        obj = obj.substring(0, obj.length - 1);

      // Hide session tokens
      obj = this._removeBetween(obj, "<Cookie>__sessiontoken=", "</Cookie>");
      obj = this._removeBetween(obj, "<X-Security-Token>", "</X-Security-Token>");
      obj = this._removeBetween(obj, '<sessiontoken xsi:type="xsd:string">', '</sessiontoken>');
      obj = this._removeBetween(obj, "<pstrSessionToken xsi:type='xsd:string'>", "</pstrSessionToken>");
      obj = this._removeBetween(obj, "<pstrSecurityToken xsi:type='xsd:string'>", "</pstrSecurityToken>");
      obj = this._removeBetween(obj, '<password xsi:type="xsd:string">', '</password>');
    }
    return obj;
  }
}

// Public expots
exports.Util = Util;

})();