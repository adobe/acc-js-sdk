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

    const { DomUtil } = require("./domUtil");
    const XtkCaster = require('./xtkCaster.js').XtkCaster;
    const { Cache } = require('./cache.js');

    /**
     * @private
     * @class
     * @constructor
     * @memberof Campaign
     */
    class RefresherStateCache extends Cache {

        /**
         * A in-memory cache to store state of the refresher. Not intended to be used directly,
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
        put(name, rawValue) {
            return super.put(name, { value: rawValue });
        }

        /**
         * Get the value of a property of the refresh (buildNumber, last refresh time)
         * 
         * @param {string} name the propertie name
         * @returns {*} the value
         */
        get(name) {
            const option = super.get(name);
            return option ? option.value : undefined;
        }
    }

    class CacheRefresher {

        /**
        * A class to refresh regulary a Cache every 10 seconds, by sending a query to get the last modified entities
        * it hould be used in a client.
        *
        * @param {Cache} cache is the cache to refresh
        * @param {Client} client is the ACC API Client.
        * @param {ConnectionParameters} connectionParameters used to created the client provide as parameter
        * @param {string} cacheSchema is the schema present in the cache to be refreshed every 10 seconds
        * @param {string} rootKey is an optional root key to use for the storage object
        */
        constructor(cache, client, connectionParameters, cacheSchema, rootKey) {

            this._cache = cache;
            this._client = client;
            this._connectionParameters = connectionParameters;
            this._cacheSchema = cacheSchema;

            this._storage = connectionParameters._options._storage;
            this._refresherStateCache  = new RefresherStateCache(this._storage, `${rootKey}.RefresherStateCache`, 1000*3600);

            this._lastTime;
            this._buildNumber;
            this._intervalId = null;
        }

        /**
         * Start auto refresh
         * @param {any} refreshFrequency frequency of the refresh in ms ( default velue is 10 000 ms)
         */
        startAutoRefresh(refreshFrequency) {
            if (this._intervalId != null) {
                clearInterval(this._intervalId);
            }
            this._intervalId = setInterval(() => this.callAndRefresh(), refreshFrequency || 10000); // every 10 seconds by default
        }

        /**
         * Get last modified entities and remove from cache last modified entities
         */
        callAndRefresh() {
            const that = this;
            const soapCall = this._client._prepareSoapCall("xtk:session", "GetModifiedEntities", true, this._connectionParameters._options.extraHttpHeaders);

            if (this._lastTime === undefined) {
                const storedTime = this._refresherStateCache.get("time");
                if (storedTime != undefined) {
                    this._lastTime = storedTime;
                }
            }
            if (this._buildNumber === undefined) {
                const storedBuildNumber = this._refresherStateCache.get("buildNumber");
                if (storedBuildNumber != undefined) {
                    this._buildNumber = storedBuildNumber;
                }
            }

            // Use Json because xtk:schema does not work directly in DomUtil.parse(`<cache buildNumber="9469" lastModified="2022-06-30T00:00:00.000"><xtk:schema></xtk:schema></cache>`);
            // due to the colon character
            let jsonCache;
            if (this._lastTime === undefined || this._buildNumber === undefined) {
                jsonCache = {
                    [this._cacheSchema]: {}
                }
            } else {
                jsonCache = {
                    buildNumber: this._buildNumber,
                    lastModified: this._lastTime,
                    [this._cacheSchema]: {}
                }
            }

            const xmlDoc = DomUtil.fromJSON("cache", jsonCache, 'SimpleJson');
            soapCall.writeDocument("script", xmlDoc);

            // Do a soap call GetModifiedEntities instead of xtksession.GetModifiedEnties because we don't want to go through methodCache 
            // which might not contain the method GetModifiedEntities just after a build updgrade from a old version of acc 
            return this._client._makeSoapCall(soapCall)
                .then(() => {
                    let doc = soapCall.getNextDocument();
                    soapCall.checkNoMoreArgs();
                    doc = that._client._toRepresentation(doc, 'xml');
                    that._lastTime = DomUtil.getAttributeAsString(doc, "time"); // save time to be able to send it as an attribute in the next soap call
                    that._buildNumber = DomUtil.getAttributeAsString(doc, "buildNumber");
                    that.refresh(doc);
                    that._refresherStateCache.put("time", that._lastTime);
                    that._refresherStateCache.put("buildNumber", that._buildNumber);
                    Promise.resolve();
                })
                .catch((ex) => {
                    // if the method GetModifiedEntities is not found in this acc version we disable the autoresfresh of the cache
                    if (soapCall.methodName == "GetModifiedEntities" && ex.errorCode == "SOP-330006") {
                        this.stopAutoRefresh();
                    } else {
                        throw ex;
                    }
                });
        }

        // Refresh Cache : remove entities modified recently listed in xmlDoc
        refresh(xmlDoc) {
            const clearCache = XtkCaster.asBoolean(DomUtil.getAttributeAsString(xmlDoc, "emptyCache"));
            if (clearCache == true) {
                this._cache.clear();
            } else {
                var child = DomUtil.getFirstChildElement(xmlDoc, "entityCache");
                while (child) {
                    const pkSchemaId = DomUtil.getAttributeAsString(child, "pk");
                    const schemaType = DomUtil.getAttributeAsString(child, "schema");
                    if (schemaType === this._cacheSchema) {
                        this._cache.remove(pkSchemaId);
                        if (schemaType === "xtk:schema") {
                            const schemaIds = pkSchemaId.split("|");
                            this._client._notifyCacheChangeListeners(schemaIds[1]);
                        }
                    }
                    child = DomUtil.getNextSiblingElement(child);
                }
            }
        }

        stopAutoRefresh() {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    // Public exports
    exports.CacheRefresher = CacheRefresher;

})();
