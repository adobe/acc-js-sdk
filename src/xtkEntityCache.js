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

const DomUtil = require('./domUtil.js').DomUtil;
const { Cache } = require('./cache.js');


/**********************************************************************************
 * 
 * Caches Xtk Entities (schemas, etc...) 
 * 
 *********************************************************************************/

/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class XtkEntityCache extends Cache {
    
    /**
     * A in-memory cache for xtk entities. Not intended to be used directly,
     * but an internal cache for the Campaign.Client object.
     * 
     * Cached object are made of
     * - the key is a string in the form <entityType>|<entityName>, such as "xtk:schema|nms:recipient"
     * - the value is a DOM element corresponding to the entity. It's always a DOM element, regardless of the client representation
     * 
     * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
     * @param {string} rootKey is an optional root key to use for the storage object
     * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
     */
     constructor(storage, rootKey, ttl) {
        super(storage, rootKey, ttl, (entityType, entityFullName) => entityType + "|" + entityFullName, (item, serDeser) => {
            if (serDeser) {
                if (!item || !item.value) throw Error(`Cannot serialize falsy cached item`);
                const value = Object.assign({}, item);
                value.value = DomUtil.toXMLString(item.value);
                return JSON.stringify(value);
            }
            else {
                const json = JSON.parse(item);
                json.value = DomUtil.parse(json.value).documentElement;
                return json;
            }
        });
    }

    /**
     * Retrieves entity from cache
     * @param {string} entityType is the entity type, such as "xtk:srcSchema"
     * @param {string} entityFullName is the entity name, such as "nms:recipient"
     * @returns {*} the cached entity, or undefined if not found
     */
    async get(entityType, entityFullName) {
        return await super.get(entityType, entityFullName);
    }

    /**
     * Caches an entity
     * @param {string} entityType is the entity type, such as "xtk:srcSchema"
     * @param {string} entityFullName is the entity name, such as "nms:recipient"
     * @param {*} entity is the entity
     */
    async put(entityType, entityFullName, entity) {
        await super.put(entityType, entityFullName, entity);
        // For schemas, cache interfaces
        if (entityType == "xtk:schema") {
            const namespace = entity.getAttribute("namespace");
            var interfaceElement = DomUtil.getFirstChildElement(entity, "interface");
            while (interfaceElement) {
                const name = `${namespace}:${interfaceElement.getAttribute("name")}`;
                await super.put(entityType, name, interfaceElement);
                interfaceElement = DomUtil.getNextSiblingElement(interfaceElement, "interface");
            }
        }
    }
}


// Public exports
exports.XtkEntityCache = XtkEntityCache;

})();