/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
(function () {
    "use strict";

    const { DomUtil } = require("./domUtil.js");
    const XtkCaster = require('./xtkCaster.js').XtkCaster;
    const { Cache } = require('./cache.js');
    const { CampaignException } = require('./campaign.js');

    /**
     * @private
     * @class
     * @constructor
     * @memberof Campaign
     */
    class RefresherStateCache extends Cache {

        /**
         * A cache to store state of the refresher. Not intended to be used directly,
         * but an internal cache for the Campaign.Client object
         * 
         * Cached object are made of
         * - the key is the propertie name
         * - the value is a string
         * 
         * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
         * @param {string} rootKey is an optional root key to use for the storage object
         * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
         */
        constructor(storage, rootKey, ttl) {
            super(storage, rootKey, ttl);
        }

        /**
         * Cache a property of the refresh (buildNumber, last refresh time) and its value
         * 
         * @param {string} name is the propertie name
         * @param {string} rawValue string value
         */
        async put(name, rawValue) {
            return super.put(name, { value: rawValue });
        }

        /**
         * Get the value of a property of the refresh (buildNumber, last refresh time)
         * 
         * @param {string} name the propertie name
         * @returns {*} the value
         */
        async get(name) {
            const option = await super.get(name);
            return option ? option.value : undefined;
        }
    }

    /**
    * A class to refresh regulary a Cache every n seconds, by sending a query to get the last modified entities.
    * The refresh mechanism can be activated by calling client.startRefreshCaches().
    * This mechanism depends on the xtk:session:GetModifiedEntities API which is introduced in ACC 8.4 and above.
    *
    * @class
    * @constructor
    * @memberof Campaign
    * @param {Cache} cache is the cache to refresh
    * @param {Client} client is the ACC API Client.
    * @param {string} cacheSchemaId is the id of the schema present in the cache to be refreshed every 10 seconds
    * @param {string} rootKey is used as the root key of cache items in the refresher state cache
    */
    class CacheRefresher {

        constructor(cache, client, cacheSchemaId, rootKey) {
            const connectionParameters = client._connectionParameters;
            this._cache = cache;
            this._client = client;
            this._connectionParameters = connectionParameters;
            this._cacheSchemaId = cacheSchemaId;

            this._storage = connectionParameters._options._storage;
            this._refresherStateCache  = new RefresherStateCache(this._storage, `${rootKey}.RefresherStateCache`, 1000*3600);

            this._lastTime = undefined;
            this._buildNumber = undefined;
            this._intervalId = null;
            this._running = false;
        }

        /**
         * Start auto refresh
         * @param {integer} refreshFrequency frequency of the refresh in ms (default value is 10,000 ms)
         */
        startAutoRefresh(refreshFrequency) {
            this._client._trackEvent('CACHE_REFRESHER//start', undefined, {
                cacheSchemaId: this._cacheSchemaId,
                refreshFrequency: refreshFrequency
            });
            if (this._intervalId != null) {
                clearInterval(this._intervalId);
            }
            this._intervalId = setInterval(() => {
                this._safeCallAndRefresh();
            }, refreshFrequency || 10000); // every 10 seconds by default
        }

        // Protect _callAndRefresh from reentrance
        async _safeCallAndRefresh() {
            if (this._running) {
                // This call is already running and maybe taking a long time to complete. Do not make things
                // harder and just skip this run
                this._client._trackEvent('CACHE_REFRESHER//skip', undefined, {
                    cacheSchemaId: this._cacheSchemaId,
                });
                return;
            }
            this._running = true;
            try {
                await this._callAndRefresh();
            } catch(ex) {
                if (ex.errorCode === "SDK-000010") {
                    // client is not logged, this is not an error.
                    this._client._trackEvent('CACHE_REFRESHER//loggedOff', undefined, {
                        cacheSchemaId: this._cacheSchemaId,
                    });
                    return;
                }
                this._client._trackEvent('CACHE_REFRESHER//error', undefined, {
                    cacheSchemaId: this._cacheSchemaId,
                    error: ex,
                });
            console.warn(`Failed to refresh cache for ${this._cacheSchemaId}`, ex);
            }
              finally {
                this._running = false;
            }
        }

        // Get last modified entities for the Campaign server and remove from cache last modified entities
        async _callAndRefresh() {
            const that = this;
            const soapCall = this._client._prepareSoapCall("xtk:session", "GetModifiedEntities", true, true, this._connectionParameters._options.extraHttpHeaders);

            if (this._lastTime === undefined) {
                const storedTime = await this._refresherStateCache.get("time");
                if (storedTime != undefined) {
                    this._lastTime = storedTime;
                }
            }
            if (this._buildNumber === undefined) {
                const storedBuildNumber = await this._refresherStateCache.get("buildNumber");
                if (storedBuildNumber != undefined) {
                    this._buildNumber = storedBuildNumber;
                }
            }

            // Use Json because xtk:schema does not work directly in DomUtil.parse(`<cache buildNumber="9469" time="2022-06-30T00:00:00.000"><xtk:schema></xtk:schema></cache>`);
            // due to the colon character
            let jsonCache;
            if (this._lastTime === undefined || this._buildNumber === undefined) {
                jsonCache = {
                    [this._cacheSchemaId]: {}
                };
            } else {
                jsonCache = {
                    buildNumber: this._buildNumber,
                    lastModified: this._lastTime,
                    [this._cacheSchemaId]: {}
                };
            }

            const xmlDoc = DomUtil.fromJSON("cache", jsonCache, 'SimpleJson');
            soapCall.writeDocument("cacheEntities", xmlDoc);

            // Client is not logged: do not attempt to refresh caches at all
            if (!this._client.isLogged())
              throw CampaignException.NOT_LOGGED_IN(soapCall, `Cannot call GetModifiedEntities: session not connected`);

            const event = this._client._trackEvent('CACHE_REFRESHER//tick', undefined, {
                cacheSchemaId: this._cacheSchemaId,
                lastTime: this._lastTime,
                buildNumber: this._buildNumber
            });

            // Do a soap call GetModifiedEntities instead of xtksession.GetModifiedEnties because we don't want to go through methodCache 
            // which might not contain the method GetModifiedEntities just after a build updgrade from a old version of acc 
            // This is an internal SOAP call that cannot be intercepted by observers onBeforeCall / onAfterCall
            try {
                await this._client._makeSoapCall(soapCall);
                let doc = soapCall.getNextDocument();
                soapCall.checkNoMoreArgs();
                doc = that._client._toRepresentation(doc, 'xml');
                that._lastTime = DomUtil.getAttributeAsString(doc, "time"); // save time to be able to send it as an attribute in the next soap call
                that._buildNumber = DomUtil.getAttributeAsString(doc, "buildNumber");
                await that._refresh(doc, event);
                await that._refresherStateCache.put("time", that._lastTime);
                await that._refresherStateCache.put("buildNumber", that._buildNumber);
            }
            catch(ex) {
                // if the method GetModifiedEntities is not found in this acc version we disable the autoresfresh of the cache
                if (soapCall.methodName == "GetModifiedEntities" && ex.errorCode == "SOP-330006") {
                    this._client._trackEvent('CACHE_REFRESHER//abort', undefined, {
                        cacheSchemaId: this._cacheSchemaId,
                        error: ex,
                    });
                    this.stopAutoRefresh();
                } else {
                    throw ex;
                }
            }
        }

        // Refresh Cache : remove entities modified recently listed in xmlDoc
        async _refresh(xmlDoc, event) {
            const clearCache = XtkCaster.asBoolean(DomUtil.getAttributeAsString(xmlDoc, "emptyCache"));
            const evicted = [];
            if (clearCache == true) {
                await this._cache.clear();
            } else {
                var child = DomUtil.getFirstChildElement(xmlDoc, "entityCache");
                while (child) {
                    const pkSchemaId = DomUtil.getAttributeAsString(child, "pk");
                    const schemaId = DomUtil.getAttributeAsString(child, "schema");
                    if (schemaId === this._cacheSchemaId) {
                        evicted.push(schemaId);
                        await this._cache.remove(pkSchemaId);
                        // Notify listeners to refresh in SchemaCache
                        if (schemaId === "xtk:schema") {
                            const schemaIds = pkSchemaId.split("|");
                            this._client._notifyCacheChangeListeners(schemaIds[1]);
                        }
                    }
                    child = DomUtil.getNextSiblingElement(child);
                }
            }

            this._client._trackEvent('CACHE_REFRESHER//response', event, {
                cacheSchemaId: this._cacheSchemaId,
                clearCache: clearCache,
                evicted: evicted
            });
        }

        /**
         * Stop auto refreshing the cache
         */
        stopAutoRefresh() {
            if (this._intervalId) {
                this._client._trackEvent('CACHE_REFRESHER//stop', undefined, {
                    cacheSchemaId: this._cacheSchemaId,
                });
            }
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    // Public exports
    exports.CacheRefresher = CacheRefresher;

})();
