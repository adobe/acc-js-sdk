const { MetadataCache } = require("./metadataCache.js");

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


    class CacheRefresher {

        /**
        * A class to refresh regulary a Cache every 10 seconds, by sending a query to get the last modified entities
        * it hould be used in a client.
        *
        * @param {Cache} cache is the cache to refresh
        * @param {Client} client is the ACC API Client.
        * @param {ConnectionParameters} connectionParameters used to created the client provide as parameter
        * @param {string} cacheSchema is the schema present in the cache to be refreshed every 10 seconds
        * @param {MetadataCache} metadataCache is the metadata cache that contains build information
        */
        constructor(cache, client, connectionParameters, cacheSchema, metadataCache) {

            this._cache = cache;
            this._client = client;
            this._connectionParameters = connectionParameters;
            this._cacheSchema = cacheSchema;

            this._storage = connectionParameters._options._storage;
            this._metadataCache = metadataCache;

            this._lastTime;
            this._buildNumber;
            this._intervalId = setInterval(() => this.callAndRefresh(), 10000); // every 10 seconds
        }

        callAndRefresh() {
            const that = this;
            const soapCall = this._client._prepareSoapCall("xtk:session", "GetModifiedEntities", true, this._connectionParameters._options.extraHttpHeaders);

            if (this._lastTime === undefined) {
                let storedTime = this._metadataCache.get("time");
                if (storedTime != undefined) {
                    this._lastTime = storedTime;
                }
            }
            if (this._buildNumber === undefined) {
                let storedBuildNumber = this._metadataCache.get("buildNumber");
                if (storedBuildNumber != undefined) {
                    this._buildNumber = storedBuildNumber;
                }
            }

            // Use Json because xtk:schema does not work directly in DomUtil.parse(`<cache buildNumber="9469" lastModified="2022-06-30T00:00:00.000"><xtk:schema></xtk:schema></cache>`);
            // due to the semi-colon character
            var jsonCache;
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

            var xmlDoc = DomUtil.fromJSON("cache", jsonCache, 'SimpleJson');
            soapCall.writeDocument("script", xmlDoc);

            // Do a soap call GetModifiedEntities instead of xtksession.GetModifiedEnties because we don't want to go through methodCache 
            // which can be wrong just after a build updgarde from a old version of acc that has not the method GetModifiedEntities and 
            // a new version of acc that has the method GetModifiedEntities
            return this._client._makeSoapCall(soapCall)
                .then(() => {
                    var doc = soapCall.getNextDocument();
                    soapCall.checkNoMoreArgs();
                    doc = that._client._toRepresentation(doc, 'xml');
                    that._lastTime = DomUtil.getAttributeAsString(doc, "time"); // save time to be able to send it as an attribute in the next soap call
                    that._buildNumber = DomUtil.getAttributeAsString(doc, "buildNumber");
                    that.refresh(doc, that._cacheSchema);
                    that._metadataCache.put("time", that._lastTime);
                    that._metadataCache.put("buildNumber", that._buildNumber);
                    Promise.resolve();
                })
                .catch((ex) => {
                    if (soapCall.methodName == "GetModifiedEntities" && ex.errorCode == "SOP-330006") {
                        clearInterval(this._intervalId);
                        this._intervalId = null;
                    }
                });
        }

        // Refresh Cache : remove entities modified recently listed in xmlDoc
        refresh(xmlDoc, cacheSchema) {
            console.log("cache refresh " + cacheSchema);
            const bClearCache = XtkCaster.asBoolean(DomUtil.getAttributeAsString(xmlDoc, "emptyCache"));
            if (bClearCache == true) {
                console.log("Clear cache");
                this._cache.clear();
            } else {
                var child = DomUtil.getFirstChildElement(xmlDoc, "entityCache");
                while (child) {
                    let schemaId = DomUtil.getAttributeAsString(child, "pk");
                    let schemaType = DomUtil.getAttributeAsString(child, "schema");
                    if (schemaType == cacheSchema) {
                        console.log("remove " + schemaId); // TODO: delete log
                        this._cache.remove(schemaId);
                    }
                    child = DomUtil.getNextSiblingElement(child);
                }
            }
        }

        stopRefresh() {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    // Public exports
    exports.CacheRefresher = CacheRefresher;

})();
