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
 * A cache for Campaign SOAP methods definition
 * 
 *********************************************************************************/

const DomUtil = require('./dom.js').DomUtil;


function MethodCache() {
    this.methodsBySchema = {};
}

/**
 * Caches all methods of a schema
 * @param {Element} schema DOM document node represening the schema 
 */
MethodCache.prototype.cache = function(schema) {
    var namespace = DomUtil.getAttributeAsString(schema, "namespace");
    var name = DomUtil.getAttributeAsString(schema, "name");
    var root = DomUtil.getFirstChildElement(schema);
    while (root) {
        var schemaId = undefined;
        if (root.nodeName == "interface")
            schemaId = namespace + ":" + DomUtil.getAttributeAsString(root, "name");
        else if (root.nodeName == "methods")
            schemaId = namespace + ":" + name;
        if (schemaId) {
            this.methodsBySchema[schemaId] = this.methodsBySchema[schemaId] || {};
            var child = DomUtil.getFirstChildElement(root, "method");
            while (child) {
                const methodName = DomUtil.getAttributeAsString(child, "name");
                this.methodsBySchema[schemaId][methodName] = child;
                child = DomUtil.getNextSiblingElement(child, "method");
            }
        }
        root = DomUtil.getNextSiblingElement(root);
    }
}

MethodCache.prototype.get = function(schemaId, methodName) {
    var dict = this.methodsBySchema[schemaId];
    if (dict) 
        dict = dict[methodName];
    return dict;
}

MethodCache.prototype.clear = function() {
    this.methodsBySchema = {};
}

exports.MethodCache = MethodCache;