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


/**********************************************************************************
 * 
 * A simple cache for XtkEntities, options, etc.
 * 
 *********************************************************************************/

/**
 * @private
 * @class
 * @constructor
 * @memberof Utils
 */
class SafeStorage {

  /**
   * A wrapper to the Storage interface (LocalStorage, etc.) which is "safe", i.e.
   * 
   * - it will never throw / support local stroage to be undefined or not accessible
   * - Handle the notion of "root key", i.e. prefix 
   * - Set/get values as JSON only and not as strings
   * - Silently caches all exceptions
   * - Automatically remove from storage cached values which are not valid, expired, or cannot be parsed
   * 
   * SafeStorage objects are created automatically by Caches
   * 
   * @param {Storage} delegate an optional delegate options, confomring to the Storage interface (getItem, setItem, removeItem)
   * @param {string} rootKey an optional prefix which will be prepend to all keys
   */
  constructor(delegate, rootKey) {
    this._delegate = delegate;
    this._rootKey = rootKey ? `${rootKey}$` : "";
  }

  /**
   * Get an item from storage
   * @param {string} key the item key (relative to the root key)
   * @returns {Object} the cached JSON object, or undefined if not found 
   */
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

  /**
   * Put an item into storage
   * @param {string} key the item key (relative to the root key)
   * @param {Object} json the value to cache
   */
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

  /**
   * Removes an item from the storage
   * @param {string} key the item key (relative to the root key)
   */
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
 * @private
 * @class
 * @constructor
 * @memberof Utils
 */
class CachedObject {

  /**
   * An object in the cache, i.e. a wrapped to a cached value and additional metadata to manage the cache.
   * Do not create such objects directly, they are 100% managed by the Cache object
   * 
   * @param {*} value the cached value
   * @param {number} cachedAt the timestamp at which the value was cached
   * @param {number} expiresAt the timestamp at which the cached value expires
   */
  constructor(value, cachedAt, expiresAt) {
      this.value = value;
      this.cachedAt = cachedAt;
      this.expiresAt = expiresAt;
  }
}

/** 
 * @private
 * @class
 * @constructor
 * @memberof Utils
 */
class Cache {

  /**
   * A general purpose in-memory cache with TTL. In addition to caching in memory, the cache has the ability to delegate the caching
   * to a persistent cache, such as the browser localStorage. The interface is 100% synchronous.
   * 
   * By default, caches take a single parameter for the key. It is possible however to use a more complex scenario by setting a makeKeyFn.
   * When set, such a function will take 1 or more arguments and will be responsible to create a primitive key (a string) from the arguments.
   * The cache public APIs : get and put therefore can take a variable number of key arguments, which will be combined into the actual primitive key.
   * 
   * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage. This object will be wrapped into a SafeStorage object to ensure access is safe and will not throw any exceptions
   * @param {string} rootKey is an optional root key to use for the storage object
   * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
   * @param {function} makeKeyFn is an optional function which will generate a key for objects in the cache. It's passed the arguments of the cache 'get' function
   */
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

  /**
   * Get a value from the cache
   * @param {*} key the key or keys of the value to retreive
   * @returns {*} the cached value, or undefined if not found
   */
  get() {
      const key = this._makeKeyFn.apply(this, arguments);
      const cached = this._getIfActive(key);
      return cached;
  }

  /**
   * Put a value from the cache
   * @param {*} key the key or keys of the value to retreive
   * @param {*} value the value to cache
   * @returns {CachedObject} a cached object containing the cached value
   */
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
  
  /**
   * Removes everything from the cache. It does not directly removes data from persistent storage if there is, but it marks the cache
   * as cleared so that subsequent get operation will not actually return any data cached in persistent storage
   */
  clear() {
      this._cache = {};
      this._saveLastCleared();
  }
}

// Public expots
exports.Util = Util;
exports.SafeStorage = SafeStorage;
exports.Cache = Cache;

})();