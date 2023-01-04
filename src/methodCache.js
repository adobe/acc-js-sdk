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
 * A cache for Campaign SOAP methods definition
 * 
 *********************************************************************************/

const DomUtil = require('./domUtil.js').DomUtil;
const { Cache } = require('./cache.js');

/**
 * @namespace Campaign
 * 
 * @typedef {DOMElement} SoapMethodDefinition
 * @memberof Campaign
 */

/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class MethodCache extends Cache {

    /**
     * A in-memory cache for SOAP call method definitions. Not intended to be used directly,
     * but an internal cache for the Campaign.Client object
     * 
     * Cached object are made of
     * - the key is a string in the form <schemaId>#<methodName>, such as "xtk:session#GetServerTime"
     * - the value is a JSON object made of two attributes:
     *          - the "urn" attribute, such as "xtk:persist", which is the URN to use to make the SOAP call
     *          - the "method" attribute, a DOM element corresponding to the method XML element
     * 
     * @param {Storage} storage is an optional Storage object, such as localStorage or sessionStorage
     * @param {string} rootKey is an optional root key to use for the storage object
     * @param {number} ttl is the TTL for objects in ms. Defaults to 5 mins
     */
    constructor(storage, rootKey, ttl) {
        super(storage, rootKey, ttl, ((schemaId, methodName) => schemaId + "#" + methodName ), (item, serDeser) => {
            if (serDeser) {
                if (!item || !item.value || !item.value.method) throw Error(`Cannot serialize falsy cached item`);
                const value = Object.assign({}, item);          // shallow copy
                value.value = Object.assign({}, value.value);   // dummy deep copy
                value.value.method = DomUtil.toXMLString(item.value.method);
                return JSON.stringify(value);
            }
            else {
                const json = JSON.parse(item);
                json.value.method = DomUtil.parse(json.value.method).documentElement;
                return json;
            }
        });
    }

    /**
     * Caches all methods of a schema
     * For backward compatibility purpose. Use "put" instead
     * 
     * @deprecated
     * @param {Element} schema DOM document node represening the schema 
     */
    async cache(schema) {
        return await this.put(schema);
    }
    
    /**
     * Caches all methods of a schema
     * 
     * @param {Element} schema DOM document node represening the schema 
     */
    async put(schema) {
        var namespace = DomUtil.getAttributeAsString(schema, "namespace");
        var name = DomUtil.getAttributeAsString(schema, "name");
        var impls = DomUtil.getAttributeAsString(schema, "implements");
        var root = DomUtil.getFirstChildElement(schema);
        while (root) {
            let schemaId;
            if (root.nodeName == "interface") {
                const nodeName = DomUtil.getAttributeAsString(root, "name");
                schemaId = `${namespace}:${nodeName}`;
            }
            else if (root.nodeName == "methods") {
                schemaId = `${namespace}:${name}`;
            }
            if (schemaId) {
                var child = DomUtil.getFirstChildElement(root, "method");
                while (child) {
                    const methodName = DomUtil.getAttributeAsString(child, "name");
                    const cached = { method: child, urn: schemaId };
                    await super.put(schemaId, methodName, cached);
                    child = DomUtil.getNextSiblingElement(child, "method");
                }
            }
            root = DomUtil.getNextSiblingElement(root);
        }

        // If the schema implements an interface, then add the interface methods to the schema
        // methods in the cache, using the "<interface>|<schemaId>" urn
        // example: xtk:session implements xtk:persist, and therefore will have xtk:persist methods
        // under the urn "xtk:persist|xtk:session"
        if (impls) {
            const schemaId = `${namespace}:${name}`;
            const prefix = `${impls}#`;
            const urn = `${impls}|${schemaId}`;
            const keys = Object.keys(this._cache);
            for (const key of keys) {
                if (key.startsWith(prefix)) {
                    let cached = this._cache[key].value;
                    cached = { method: cached.method, urn: urn };
                    const methodName = DomUtil.getAttributeAsString(cached.method, "name");
                    await super.put(schemaId, methodName, cached);
                }
            }
        }
    }

    /**
     * Get cached method of a schema
     *
     * @param {string} schemaId the schema id (ex: "nms:delivery")
     * @param {string} methodName the method name
     * @returns {Campaign.SoapMethodDefinition} the method definition, or undefined if the schema or the method is not found
     */
    async get(schemaId, methodName) {
        const cached = await super.get(schemaId, methodName);
        return cached ? cached.method : undefined;
    }

    /**
     * Get the URL (i.e. SoapAction header) for a method
     *
     * @param {string} schemaId the schema id (ex: "nms:delivery")
     * @param {string} methodName the method name
     * @returns {string} the URN (or Soap action header), or undefined if the schema or the method is not found
     */
    async getSoapUrn(schemaId, methodName) {
        const cached = await super.get(schemaId, methodName);
        return cached ? cached.urn : undefined;
    }
}


// Public exports
exports.MethodCache = MethodCache;

})();
