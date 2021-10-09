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
const { Cache } = require('./util.js');


/**********************************************************************************
 * 
 * Caches Xtk Entities (schemas, etc...) 
 * 
 *********************************************************************************/

class XtkEntityCache extends Cache {
    
    constructor(storage, rootKey, ttl) {
        super(storage, rootKey, ttl, (entityType, entityFullName) => entityType + "|" + entityFullName);
    }

    /**
     * Retrieves entity from cache
     * @param {string} entityType is the entity type, such as "xtk:srcSchema"
     * @param {string} entityFullName is the entity name, such as "nms:recipient"
     * @returns {*} the cached entity, or undefined if not found
     */
    get(entityType, entityFullName) {
        return super.get(entityType, entityFullName);
    }

    /**
     * Caches an entity
     * @param {string} entityType is the entity type, such as "xtk:srcSchema"
     * @param {string} entityFullName is the entity name, such as "nms:recipient"
     * @param {*} entity is the entity
     */
    put(entityType, entityFullName, entity) {
        super.put(entityType, entityFullName, entity);
        // For schemas, cache interfaces
        if (entityType == "xtk:schema") {
            const namespace = entity.getAttribute("namespace");
            var interfaceElement = DomUtil.getFirstChildElement(entity, "interface");
            while (interfaceElement) {
                const name = `${namespace}:${interfaceElement.getAttribute("name")}`;
                super.put(entityType, name, interfaceElement);
                interfaceElement = DomUtil.getNextSiblingElement(interfaceElement, "interface");
            }
        }
    }
}


// Public exports
exports.XtkEntityCache = XtkEntityCache;

})();