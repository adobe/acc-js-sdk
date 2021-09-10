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
 * Generic utilities
 * 
 *********************************************************************************/

/**
 * @namespace Campaign
 */

/**
 * Helpers for common manipulation of DOM documents
 * @memberof Campaign
 * @class
 * @constructor
 */
class Util {
    
    static isArray(o) {
        if (o === null || o === undefined) return false;
        // JavaScript arrays are objects
        if (typeof o != "object") return false;
        // They also have a length property. But checking the length is not enough
        // since, it can also be an object litteral with a "length" property. Campaign
        // schema attributes typically have a "length" attribute and are not arrays
        if (o.length === undefined || o.length === null) return false;
        // So check for a "push" function
        if (o.push === undefined || o.push === null) return false;
        if (typeof o.push != "function") 
            return false;
        return true;
    }


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
    
      static trim(text) {
        if (text == null || text == undefined) return undefined;
        if (Util.isArray(text)) {
          const a = [];
          for (const p of text) {
            a.push(Util.trim(p));
          }
          return a;
        }
        if (typeof text == "object") {
          for (const p in text) {
            text[p] = Util.trim(text[p]);
          }
        }
        if (typeof text == "string") {
          // Remove trailing blanks
          while (text && (text.endsWith(' ') || text.endsWith('\n') || text.endsWith('\r') || text.endsWith('\t')))
            text = text.substring(0, text.length - 1);
    
          // Hide session tokens
          text = this._removeBetween(text, "<Cookie>__sessiontoken=", "</Cookie>");
          text = this._removeBetween(text, "<X-Security-Token>", "</X-Security-Token>");
          text = this._removeBetween(text, '<sessiontoken xsi:type="xsd:string">', '</sessiontoken>');
        }
        return text;
      }

}

// Public expots
exports.Util = Util;
