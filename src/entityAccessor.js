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
 * Helper function to navigate an entity, regardless of its representation
 * 
 *********************************************************************************/
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const DomUtil = require('./dom.js').DomUtil;

const EntityAccessor = {
}

// Wraps accessors to a common interface, regardless of the representation
EntityAccessor.getAttributeAsString = function(entity, name) {
    if (entity.insertAdjacentElement)
        return DomUtil.getAttributeAsString(entity, name);
    else if (entity.__representation == "BadgerFish")
        return XtkCaster.asString(entity[`@${name}`]);
    else 
        return XtkCaster.asString(entity[name]);
}

EntityAccessor.getAttributeAsLong = function(entity, name) {
    if (entity.insertAdjacentElement)
        return DomUtil.getAttributeAsLong(entity, name);
    else if (entity.__representation == "BadgerFish")
        return XtkCaster.asLong(entity[`@${name}`]);
    else 
        return XtkCaster.asLong(entity[name]);
}

EntityAccessor.getAttributeAsBoolean = function(entity, name) {
    if (entity.insertAdjacentElement)
        return DomUtil.getAttributeAsBoolean(entity, name);
    else if (entity.__representation == "BadgerFish")
        return XtkCaster.asBoolean(entity[`@${name}`]);
    else 
        return XtkCaster.asBoolean(entity[name]);
}

EntityAccessor.getChildElements = function(entity, tagName) {
    if (entity.insertAdjacentElement) {
        var elements = [];
        var child = DomUtil.getFirstChildElement(entity);
        while (child) {
            if (!tagName || tagName == child.tagName)
                elements.push(child);
            child = DomUtil.getNextSiblingElement(child);
        }
        return elements;
    }
    else {
        var elements = entity[tagName] || [];
        if (!DomUtil.isArray(elements)) elements = [ elements ];
        return elements;
    }
}
EntityAccessor.getElement = function(entity, tagName) {
    if (entity.insertAdjacentElement) {
        var child = DomUtil.getFirstChildElement(entity);
        while (child) {
            if (tagName == child.tagName)
                return child;
            child = DomUtil.getNextSiblingElement(child);
        }
        return null;
    }
    else {
        const child = entity[tagName];
        return child ? child : null;
    }
}

/**
 * Public exports
 */
 exports.EntityAccessor = EntityAccessor;
