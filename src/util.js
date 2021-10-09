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

    static isBrowser() {
        const browser = typeof window !== 'undefined';
        return browser;
    }
    
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
            if (p.toLowerCase() === "x-security-token")
              text[p] = "***";
            else if (p === "Cookie") {
              var index = text[p].toLowerCase().indexOf("__sessiontoken");
              if (index !== -1) {
                index = text[p].indexOf("=", index);
                if (index !== -1) {
                  index = index + 1;
                  const endIndex = text[p].indexOf(";", index);
                  if (endIndex == -1)
                    text[p] = text[p].substring(0, index) + "***";
                  else 
                    text[p] = text[p].substring(0, index) + "***" + text[p].substring(endIndex);
                }
              }
            }
            else
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
          text = this._removeBetween(text, "<pstrSessionToken xsi:type='xsd:string'>", "</pstrSessionToken>");
          text = this._removeBetween(text, "<pstrSecurityToken xsi:type='xsd:string'>", "</pstrSecurityToken>");
          text = this._removeBetween(text, '<password xsi:type="xsd:string">', '</password>');
        }
        return text;
      }
}


/**********************************************************************************
 * 
 * A simple cache for XtkEntities, options, etc.
 * 
 *********************************************************************************/


// Wrapper to LocalStorage which is "safe"
// - Will never throw / support local stroage to be undefined or not accessible
// - Handle the notion of "root key", i.e. prefix 
// - Set/get values as JSON only
class SafeStorage {

  constructor(delegate, rootKey) {
    this._delegate = delegate;
    this._rootKey = rootKey ? `${rootKey}$` : "";
  }

  getItem(key) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    const itemKey = `${this._rootKey}${key}`;
    const raw = this._delegate.getItem(itemKey);
    if (!raw)
      return undefined;
    try {
      return JSON.parse(raw);
    } catch(ex) {
      this.removeItem(key);
    }
  }

  setItem(key, json) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    try {
      if (json && typeof json === "object") {
        const raw = JSON.stringify(json);
        this._delegate.setItem(`${this._rootKey}${key}`, raw);
        return;
      }
    } catch(ex) { /* Ignore errors in safe class */
    }
    this.removeItem(key);
  }

  removeItem(key) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    try {
      this._delegate.removeItem(`${this._rootKey}${key}`);
    } catch(ex) { /* Ignore errors in safe class */
    }
  }
}

/**
 * An object in the cache.
 */
class CachedObject {
  constructor(value, cachedAt, expiresAt) {
      this.value = value;
      this.cachedAt = cachedAt;
      this.expiresAt = expiresAt
  }
}

/**
 * A general purpose cache with TTL
 * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
 * @param {string} rootKey is an optional root key to use for the storage object
 * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
 * @param {makeKeyFn} is an optional function which will generate a key for objects in the cache. It's passed the arguments of the cache 'get' function
 */
class Cache {
  constructor(storage, rootKey, ttl, makeKeyFn) {
      this._storage = new SafeStorage(storage, rootKey);
      this._ttl = ttl || 1000*300;
      this._makeKeyFn = makeKeyFn || ((x) => x);
      this._cache = {};
      // timestamp at which the cache was last cleared
      this._lastCleared = this._loadLastCleared();
  }

  // Load timestamp at which the cache was last cleared
  _loadLastCleared() {
    const json = this._storage.getItem("lastCleared");
    return json ? json.timestamp : undefined;
  }

  _saveLastCleared() {
    const now = Date.now();
    this._lastCleared = now;
    this._storage.setItem("lastCleared", { timestamp: now});
  }

  // Load from local storage
  _load(key) {
    const json = this._storage.getItem(key);
    if (!json || !json.cachedAt || json.cachedAt <= this._lastCleared) {
      this._storage.removeItem(key);
      return;
    }
    return json;
  }

  // Save to local storage
  _save(key, cached) {
    this._storage.setItem(key, cached);
  }

  // Remove from local storage
  _remove(key) {
    this._storage.removeItem(key);
  }

  _getIfActive(key) {
    // In memory cache?
    var cached = this._cache[key];
    // Local storage ?
    if (!cached) {
      cached = this._load(key);
      this._cache[key] = cached;
    }
    if (!cached) 
      return undefined;
    if (cached.expiresAt <= Date.now()) {
      delete this._cache[key];
      this._remove(key);
      return undefined;
    }
    return cached.value;
  }

  get() {
      const key = this._makeKeyFn.apply(this, arguments);
      const cached = this._getIfActive(key);
      return cached;
  }

  put() {
      const value = arguments[arguments.length -1];
      const key = this._makeKeyFn.apply(this, arguments);
      const now = Date.now();
      const expiresAt = now + this._ttl;
      const cached = new CachedObject(value, now, expiresAt);
      this._cache[key] = cached;
      this._save(key, cached);
      return cached;
  }
  
  clear() {
      this._cache = {};
      this._saveLastCleared();
  }
}

// Public expots
exports.Util = Util;
exports.SafeStorage = SafeStorage;
exports.Cache = Cache;
