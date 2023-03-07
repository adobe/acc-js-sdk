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
  
const { Util } = require("./util.js");


/**********************************************************************************
 * 
 * Cache utilities
 * 
 *********************************************************************************/

/**
 * @namespace Utils
 */


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
   * @param {function} serDeser serializarion & deserialization function. First parameter is the object or value to serialize
   *                            or deserialize, and second parameter is true for serialization or false for deserialization
   */
  constructor(delegate, rootKey, serDeser) {
    if (!serDeser)
      serDeser = (item, serDeser) => {
        if (serDeser) { 
          if (!item) throw Error(`Cannot serialize falsy cached item`);
          if (typeof item !== "object") throw Error(`Cannot serialize non-object`);
          return JSON.stringify(item); 
        }
        else { 
          if (!item) throw Error(`Cannot deserialize falsy cached item`);
          return JSON.parse(item); 
        }
    };
    this._delegate = delegate;
    this._rootKey = rootKey ? `${rootKey}$` : "";
    this._serDeser = serDeser;
  }

  /**
   * Get an item from storage
   * @param {string} key the item key (relative to the root key)
   * @returns {Utils.CachedObject} the cached object, or undefined if not found. 
   *                               The storage serDeser fucntion will be used to deserialize the cached value
   */
  async getItem(key) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    const itemKey = `${this._rootKey}${key}`;
    const raw = await Util.asPromise(this._delegate.getItem(itemKey));
    if (!raw)
      return undefined;
    try {
      return this._serDeser(raw, false);
    } catch(ex) {
      this.removeItem(key);
    }
  }

  /**
   * Put an item into storage
   * @param {string} key the item key (relative to the root key)
   * @param {Utils.CachedObject} json the object to cache
   *                               The storage serDeser fucntion will be used to serialize the cached value
   */
  async setItem(key, json) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    try {
      //if (json && typeof json === "object") {
      const raw = this._serDeser(json, true);
      await Util.asPromise(this._delegate.setItem(`${this._rootKey}${key}`, raw));
      return;
    } catch(ex) { /* Ignore errors in safe class */
      await this.removeItem(key);
    }
  }

  /**
   * Removes an item from the storage
   * @param {string} key the item key (relative to the root key)
   */
  async removeItem(key) {
    if (!this._delegate || this._rootKey === undefined || this._rootKey === null)
      return;
    try {
      await this._delegate.removeItem(`${this._rootKey}${key}`);
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
   * @param {function} serDeser serializarion & deserialization function. First parameter is the object or value to serialize
   *                            or deserialize, and second parameter is true for serialization or false for deserialization
   */
  constructor(storage, rootKey, ttl, makeKeyFn, serDeser) {
      this._storage = new SafeStorage(storage, rootKey, serDeser);
      this._ttl = ttl || 1000*300;
      this._makeKeyFn = makeKeyFn || ((x) => x);
      this._cache = {};
      // timestamp at which the cache was last cleared
      // The variable is set with special "null" value to indicate that the
      // timestamp at which the cache was clear is not known, and therefore
      // needs to be fetched. It will be fetched dynamically when needed, 
      // resulting in either an undefined value (cache was never cleared)
      // or a actual timestamp.
      this._lastCleared = null;
      this._stats = {
        reads: 0,
        writes: 0,
        removals: 0,
        clears: 0,
        memoryHits: 0,
        storageHits: 0,
        loads: 0,
        saves: 0,
      };
  }

  // Load timestamp at which the cache was last cleared
  async _loadLastCleared() {
    const json = await this._storage.getItem("lastCleared");
    return json ? json.timestamp : undefined;
  }

  async _saveLastCleared() {
    const now = Date.now();
    this._lastCleared = now;
    await this._storage.setItem("lastCleared", { timestamp: now});
  }

  // Load from local storage
  async _load(key) {
    this._stats.loads = this._stats.loads + 1;
    // A null value here indicates that we have not yet loaded the
    // timestamp at which the cache was cleared last
    if (this._lastCleared === null) 
      this._lastCleared = await this._loadLastCleared();
    const json = await this._storage.getItem(key);
    if (!json || !json.cachedAt || json.cachedAt <= this._lastCleared) {
      await this._storage.removeItem(key);
      return;
    }
    return json;
  }

  // Save to local storage
  async _save(key, cached) {
    this._stats.saves = this._stats.saves + 1;
    await this._storage.setItem(key, cached);
  }

  // Remove from local storage
  async _remove(key) {
    await this._storage.removeItem(key);
  }

  async _getIfActive(key) {
    // In memory cache?
    var cached = this._cache[key];
    var memoryHit = !!cached;
    // Local storage ?
    if (!cached) {
      cached = await this._load(key);
      this._cache[key] = cached;
    }
    if (!cached) 
      return undefined;
    if (cached.expiresAt <= Date.now()) {
      delete this._cache[key];
      await this._remove(key);
      return undefined;
    }
    this._stats.memoryHits = this._stats.memoryHits + 1;
    if (!memoryHit) this._stats.storageHits = this._stats.storageHits + 1;
    return cached.value;
  }

  /**
   * Get a value from the cache
   * @param {*} key the key or keys of the value to retreive
   * @returns {*} the cached value, or undefined if not found
   */
  async get() {
      this._stats.reads = this._stats.reads + 1;
      const key = this._makeKeyFn.apply(this, arguments);
      const cached = await this._getIfActive(key);
      return cached;
  }

  /**
   * Put a value from the cache
   * @param {*} key the key or keys of the value to retrieve
   * @param {*} value the value to cache
   * @returns {CachedObject} a cached object containing the cached value
   */
   async put() {
      this._stats.writes = this._stats.writes + 1;
      const value = arguments[arguments.length -1];
      const key = this._makeKeyFn.apply(this, arguments);
      const now = Date.now();
      const expiresAt = now + this._ttl;
      const cached = new CachedObject(value, now, expiresAt);
      this._cache[key] = cached;
      await this._save(key, cached);
      return cached;
  }
  
  /**
   * Removes everything from the cache. It does not directly removes data from persistent storage if there is, but it marks the cache
   * as cleared so that subsequent get operation will not actually return any data cached in persistent storage
   */
  async clear() {
      this._stats.clears = this._stats.clears + 1;
      this._cache = {};
      await this._saveLastCleared();
  }

  /**
   * Remove a key from the cache
   * @param {string} key the key to remove
   */
  async remove(key) {
      this._stats.removals = this._stats.removals + 1;
      delete this._cache[key];
      await this._remove(key);
  }
}

// Public expots
exports.SafeStorage = SafeStorage;
exports.Cache = Cache;

})();