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
 * Helper function to navigate an entity, regardless of its representation
 * 
 *********************************************************************************/
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const { DomUtil, BadgerFishObject } = require('./domUtil.js');
const { Util } = require("./util.js");

/**
 * @namespace XML
 */

/**
 * The XtkObject type is a Campaign entity, represented either as a DOM element, or as a JavaScript
 * literal object, depending on the selected representation (xml, SimpleJson or BadgerFish)
 * 
 * @typedef {DOMElement|SimpleJson|BadgerFish} XtkObject
 * @memberOf XML
 */

/**
 * An entity accessor enables you to access properties of entity objects manipulated by
 * the JS SDK. With the representations mechanism, the SDK can work with either xml or
 * json documents. You can use the DOM API to manipulate XML documents, and native
 * JavaScript for json documents. The EntityAccessor provides a common API for both,
 * which can be used on entities manipulated by the SDK regardless of their representation
 * as xml or json.
 * <p>
 * It's a static object and only contains static methods.
 * @class
 * @memberof XML
 */
class EntityAccessor {
    
    constructor() {
    }

    /**
     * Get an attribute value and cast into an XTK string. By attribute here, we mean that it's an
     * actual XML attribute in the original XML document taken or returned by the SOAP API. 
     * @method
     * @param {XML.XtkObject} entity the entity (XML or JSON)
     * @param {string} name the name of the attribute (without the "@" character)
     * @returns {string} the value of the attribute, as a string.
     * 
     * @example
     * const entity = { hello: "world" };
     * expect(EntityAccessor.getAttributeAsString(entity, "hello")).toBe("world");
     * expect(EntityAccessor.getAttributeAsString(entity, "notFound")).toBe("");
     *
     * @example
     * const entity = DomUtil.parse("<root hello='world'></root>")
     * expect(EntityAccessor.getAttributeAsString(entity, "hello")).toBe("world");
     */
    static getAttributeAsString(entity, name) {
        if (entity.documentElement) entity = entity.documentElement;
        if (entity.insertAdjacentElement)
            return DomUtil.getAttributeAsString(entity, name);
        else if (entity instanceof BadgerFishObject)
            return XtkCaster.asString(entity[`@${name}`]);
        else 
            return XtkCaster.asString(entity[name]);
    }

    /**
     * Get an attribute value and cast into an XTK long number (32 bits, never null). By attribute here, we mean that it's an
     * actual XML attribute in the original XML document taken or returned by the SOAP API. 
     * @method
     * @param {XML.XtkObject} entity the entity (XML or JSON)
     * @param {string} name the name of the attribute (without the "@" character)
     * @returns {number} the value of the attribute, as a 32 bits integer.
     *
     * const entity = { hello: 42 };
     * expect(EntityAccessor.getAttributeAsLong(entity, "hello")).toBe(42);
     * expect(EntityAccessor.getAttributeAsLong(entity, "notFound")).toBe(0);
     *
     * @example
     * const entity = DomUtil.parse("<root hello='42'></root>")
     * expect(EntityAccessor.getAttributeAsLong(entity, "hello")).toBe(42);
     */
    static getAttributeAsLong(entity, name) {
        if (entity.documentElement) entity = entity.documentElement;
        if (entity.insertAdjacentElement)
            return DomUtil.getAttributeAsLong(entity, name);
        else if (entity instanceof BadgerFishObject)
            return XtkCaster.asLong(entity[`@${name}`]);
        else 
            return XtkCaster.asLong(entity[name]);
    }

    /**
     * Get an attribute value and cast into an XTK boolean (never null). By attribute here, we mean that it's an
     * actual XML attribute in the original XML document taken or returned by the SOAP API. 
     * @method
     * @param {XML.XtkObject} entity the entity (XML or JSON)
     * @param {string} name the name of the attribute (without the "@" character)
     * @returns {number} the value of the attribute, as a boolean
     *
     * const entity = { hello: true };
     * expect(EntityAccessor.getAttributeAsBoolean(entity, "hello")).toBe(true);
     * expect(EntityAccessor.getAttributeAsBoolean(entity, "notFound")).toBe(false);
     *
     * @example
     * const entity = DomUtil.parse("<root hello='true'></root>")
     * expect(EntityAccessor.getAttributeAsBoolean(entity, "hello")).toBe(true);
     */
    static getAttributeAsBoolean(entity, name) {
        if (entity.documentElement) entity = entity.documentElement;
        if (entity.insertAdjacentElement)
            return DomUtil.getAttributeAsBoolean(entity, name);
        else if (entity instanceof BadgerFishObject)
            return XtkCaster.asBoolean(entity[`@${name}`]);
        else 
            return XtkCaster.asBoolean(entity[name]);
    }

    /**
     * Get the list of child elements with a given tag name
     * @method
     * @param {XML.XtkObject} entity the entity (XML or JSON)
     * @param {string} tagName the tag name of the element
     * @returns {XML[]|Object[]} a non-null array of child elements
     * 
     * @example
     * const entity = { chapter:[ { title:"A" }, { title:"B" } ] };
     * // returns an array with 2 elements: { title:"A" } and { title:"B" }
     * EntityAccessor.getChildElements(entity, "chapter");
     *
     * @example
     * const entity = DomUtil.parse("<root><chapter title='A'/><chapter title='B'/></root>")
     * // returns an array with 2 elements: <chapter title='A'/> and <chapter title='B'/>
     * EntityAccessor.getChildElements(entity, "chapter");
     */
    static getChildElements(entity, tagName) {
        if (entity.documentElement) entity = entity.documentElement;
        if (entity.insertAdjacentElement) {
            const elements = [];
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
            if (!Util.isArray(elements)) elements = [ elements ];
            return elements;
        }
    }

    /**
     * Get the the first child element with a given tag name (if there's one)
     * @method
     * @param {XML.XtkObject} entity the entity (XML or JSON)
     * @param {string} tagName the tag name of the element
     * @returns {XML.XtkObject|null} the child element, or null if it's not found
     * 
     * @example
     * const entity = { body: { title:"Hello" }  };
     * // returns an array with 1 elements: { title: "Hello" }
     * EntityAccessor.getElement(entity, "body");
     *
     * @example
     * const entity = DomUtil.parse("<root><body title="Hello"/></root>");
     * // returns an array with 1 elements: <body title="Hello"/>
     * EntityAccessor.getElement(entity, "body");
     */
    static getElement(entity, tagName) {
        if (entity.documentElement) entity = entity.documentElement;
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

}


// Public exports
exports.EntityAccessor = EntityAccessor;

})();