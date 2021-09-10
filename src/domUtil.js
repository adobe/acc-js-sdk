"use strict";
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
 * DOM Utilities
 * 
 *********************************************************************************/

const JSDOM = require("jsdom").JSDOM;
const XtkCaster = require('./xtkCaster.js').XtkCaster;

/**
 * @namespace XML
 */


/**
 * Helpers for common manipulation of DOM documents
 * @memberof XML
 * @class
 * @constructor
 */
class DomUtil {
    
    constructor() {
    }

    /**
     * Test if a object is an array
     * @todo: does not really belong to domUtil.js. Move it to a better place
     * 
     * @param {*} o the object to test
     * @returns {boolean} indicates if the object is an array
     */
    static isArray(o) {
        if (o === null || o === undefined) return false;
        // JavaScript arrays are objects
        if (typeof o != "object") return false;
        // They also have a length property. But checking the length is not enough
        // since, it can also be an object litteral with a "length" property. Campaign
        // schema attributes typically have a "length" attribute and are not arrays
        if (o.length === undefined || o.length === null) return false;
        // So check for a "push" function
        if (o.push === undefined || o.push === null) return false;
        if (typeof o.push != "function") 
            return false;
        return true;
    }

    /**
     * Parse an XML string as a DOM Document
     * 
     * @param {string} xmlString the string to parse
     * @returns {Document} the DOM document to the parsed string
     */
    static parse(xmlString) {
        const dom = new JSDOM(xmlString, {contentType: "text/xml"});
        const doc = dom.window.document;
        doc.__jsdom__ = dom;
        return doc;
        //return parseXML(xmlString);
    }

    /**
     * Creates a new DOM document
     * 
     * @param {string} name the name of the document
     * @returns a DOM Document
     */
    static newDocument(name) {
        return this.parse(`<${name}/>`);
    }

    /**
     * Escapes a string for inserting as text in an XML element
     * 
     * @param {string} text the string to escape
     * @returns {string} the escaped string
     */
    static escapeXmlString(text) {
        if (text === null || text === undefined) return text;
        var escaped = "";
        for (var i=0; i<text.length; i++) {
            var c = text[i];
            if (c === '"') escaped = escaped + "&quot;";
            else if (c === '&') escaped = escaped + "&amp;";
            else if (c === '\'') escaped = escaped + "&apos;";
            else if (c === '<') escaped = escaped + "&lt;";
            else if (c === '>') escaped = escaped + "&gt;";
            else escaped = escaped + c;
        }
        return escaped;    
    }

    /**
     * Finds the first child element with given name
     * 
     * @param {Element} element the DOM element to search child node for
     * @param {string} tagName the element tag name to search for
     * @param {boolean} throws if true, will throw an error if element if not found. If not will return null
     * @returns the first child element with given name, or null if not found
     */
    static findElement(element, tagName, throws) {
        if (element === null || element === undefined) return null;
        var child = element.firstChild;
        while (child) {
            if (child.nodeType === 1 && child.nodeName == tagName)
                return child;
            child = child.nextSibling;
        }
        if (throws)
            throw new Error(`Node ${tagName} not found`);
        return null;
    }

    /**
     * Get the first child element, optionally matching a name
     * 
     * @param {Element} node is the parent element from which we'll find the first child
     * @param {string} optionalNodeName is an optional tag name. If set, the first child with a matching name will be returned
     */
    static getFirstChildElement(node, optionalNodeName) {
        if (node === null || node === undefined) return null;
        var child = node.firstChild;
        while (child && (child.nodeType != 1 || (optionalNodeName !== undefined && child.nodeName !== optionalNodeName)))
            child = child.nextSibling;
        return child;
    }

    /**
     * Returns the text content of a node. If there are multiple content or cdata nodes, their content will
     * be concatenated. Text content of subnodes is not included
     * 
     * @param {Element} node the node to get content for
     * @returns {string} the text content
     */
    static elementValue(node) {
        var text = "";
        if (node === null || node === undefined) return text;
        var child = node.firstChild;
        while (child) {
            if (child.nodeType === 3 || child.nodeType === 4)   // text or CDATA
                text = text + child.nodeValue;
            child = child.nextSibling;
        }
        return text;
    }

    /**
     * Get the next sibling element, optionally matching a tag name
     * 
     * @param {Element} node the element to get the next sibling of
     * @param {string} optionalNodeName if set, a tag name to match
     * @returns the next sibling element with the given tag name
     */
    static getNextSiblingElement(node, optionalNodeName) {
        if (node === null || node === undefined) return null;
        var sibling = node.nextSibling;
        while (sibling && (sibling.nodeType != 1 || (optionalNodeName !== undefined && sibling.nodeName !== optionalNodeName)))
            sibling = sibling.nextSibling;
        return sibling;
    }

    /**
     * Get an attribute value, casted to a xtk string
     * 
     * @param {Element} node the element from which to get the attribute
     * @param {string} name the attribute name
     * @returns {string} the attribute value, or an empty string if the attribute is not set
     */
    static getAttributeAsString(node, name) {
        const attr = node.getAttribute(name);
        return XtkCaster.asString(attr);
    }

    /**
     * Get an attribute value, casted to a xtk byte
     * 
     * @param {Element} node the element from which to get the attribute
     * @param {string} name the attribute name
     * @returns {number} the attribute value casted to a byte number, or 0 if the attribute is not set
     */
    static getAttributeAsByte(node, name) {
        const attr = node.getAttribute(name);
        return XtkCaster.asByte(attr);
    }

    /**
     * Get an attribute value, casted to a xtk boolean
     * 
     * @param {Element} node the element from which to get the attribute
     * @param {string} name the attribute name
     * @returns {boolean} the attribute value casted to a boolean, or false if the attribute is not set
     */
    static getAttributeAsBoolean(node, name) {
        const attr = node.getAttribute(name);
        return XtkCaster.asBoolean(attr);
    }

    /**
     * Get an attribute value, casted to a xtk short
     * 
     * @param {Element} node the element from which to get the attribute
     * @param {string} name the attribute name
     * @returns {number} the attribute value casted to a short number, or 0 if the attribute is not set
     */
    static getAttributeAsShort(node, name) {
        const attr = node.getAttribute(name);
        return XtkCaster.asShort(attr);
    }

    /**
     * Get an attribute value, casted to a xtk long (32 bits integer)
     * 
     * @param {Element} node the element from which to get the attribute
     * @param {string} name the attribute name
     * @returns {number} the attribute value casted to a long number, or 0 if the attribute is not set
     */
    static getAttributeAsLong(node, name) {
        const attr = node.getAttribute(name);
        return XtkCaster.asLong(attr);
    }

    /**
     * Serialize a DOM element or a DOM document as an XML string
     * 
     * @param {Element|Document} node the element or document to serialize
     * @returns {string} the serialized XML string
     */
    static toXMLString(node) {
        var s = "";
        if (node) {
            if (node.__jsdom__) 
                return node.__jsdom__.serialize();
            if (node.nodeType == 9) // documentElement 
                node = node.documentElement;
            s = node.outerHTML;
        }
        return s;
    }

    /**
     * Internal recursive method to convert a object literal (JSON) to an XML element/document.
     * This function does not return anything. Instead it creates children elements in the passed 'xmlRoot' element
     * 
     * @private
     * @param {Document} doc the DOM document owning the created elements
     * @param {Element} xmlRoot the parent DOM element
     * @param {Object} jsonRoot the object literal to convert
     * @param {string} flavor the JSON flavor: "SimpleJson" or "BadgerFish"
     */
    static _fromJSON(doc, xmlRoot, jsonRoot, flavor) {
        for(var att in jsonRoot) {
            const value = jsonRoot[att];
            if (value === null || value === undefined)
                continue;
            const t = typeof value;
            var isAtt = att[0] == '@';
            var attFirstIndex = 1;

            if (flavor == "SimpleJson") {
                if ((t == "string" || t == "number" || t == "boolean") && att[0] != '$') {
                    isAtt = true;
                    attFirstIndex = 0;
                }
            }

            if (isAtt) {
                att = att.substr(attFirstIndex);
                if (t == "string")
                    xmlRoot.setAttribute(att, XtkCaster.asString(value));
                else if (t == "number")
                    xmlRoot.setAttribute(att, XtkCaster.asString(XtkCaster.asNumber(value)));
                else if (t == "boolean")
                    xmlRoot.setAttribute(att, XtkCaster.asString(XtkCaster.asBoolean(value)));
                else
                    throw new Error(`Cannot cast JSON to XML: attribute '${att}' type '${t}' is unknown or not supported yet`);
            }
            else {
                if (att == "$") {
                    xmlRoot.textContent = value;
                }
                else if (flavor == "SimpleJson" && att[0] == '$') {
                    att = att.substr(1);
                    const xmlElement = doc.createElement(att);
                    xmlElement.textContent = value;
                    xmlRoot.appendChild(xmlElement);
                }
                else if (t == "object") {
                    if (value.length !== undefined && value.length !== null) {
                        for (var i=0; i<value.length; i++) {
                            const xmlElement = doc.createElement(att);
                            this._fromJSON(doc, xmlElement, value[i], flavor);
                            xmlRoot.appendChild(xmlElement);
                        }
                    }
                    else {
                        const xmlElement = doc.createElement(att);
                        this._fromJSON(doc, xmlElement, value, flavor);
                        xmlRoot.appendChild(xmlElement);
                    }
                }
                else
                    throw new Error(`Cannot cast JSON to XML: element '${att}' type '${t}' is unknown or not supported yet`);
            }
        }

    }

    /**
     * Convert a object literal (JSON) to an XML document.
     * 
     * @param {string} docName the name of the XML document (tag of the root node)
     * @param {Object} json the object literal to convert
     * @param {string} flavor the JSON flavor: "SimpleJson" or "BadgerFish"
     * @returns {Document} An XML document corresponding to the converted obejct literal
     */
    static fromJSON(docName, json, flavor) {
        flavor = flavor || "SimpleJson";
        if (flavor != "SimpleJson" && flavor != "BadgerFish")
            throw new Error(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
        if (!docName)
            throw new Error(`Cannot transform entity of flavor '${flavor}' to xml because no XML root name was given`);
        const doc = this.newDocument(docName);
        const root = doc.documentElement;
        this._fromJSON(doc, root, json, flavor);
        return doc;
    }

    /**
     * Internal recursive method to convert an XML element to a object literal (JSON)
     * This function does not return anything. Instead it creates children elements in the passed 'json' object
     * 
     * @private
     * @param {Element} xml the DOM element to convert to JSON
     * @param {Object} json the object literal to write to
     * @param {string} flavor the JSON flavor: "SimpleJson" or "BadgerFish"
     */
    static _toJSON(xml, json, flavor) {
        if (xml.hasAttributes()) {
            var attributes = xml.attributes;
            for (var i=0; i<attributes.length; i++) {
                var att = attributes[i];
                var attName = (flavor == "BadgerFish" ? "@" : "") + att.name;
                json[attName] = att.value;
            }
        }

        // Heuristic to determine if element is an object or an array
        const isCollection = xml.tagName.length > 11 && xml.tagName.substr(xml.tagName.length-11) == '-collection';

        var child = xml.firstChild;
        while (child) {
            var childName = child.nodeName;
            if (isCollection && (json[childName] === null || json[childName] === undefined))
                json[childName] = [ ];
            var isArray = !!json[childName];
            if (isArray && !this.isArray(json[childName]))
                json[childName] = [ json[childName] ];
            if (child.nodeType == 1) {  // element
                const jsonChild = {};
                this._toJSON(child, jsonChild, flavor);
                if (isArray) 
                    json[childName].push(jsonChild);
                else
                    json[childName] = jsonChild;
            }
            else if (child.nodeType === 3 || child.nodeType === 4) { // text and CDATA
                if (flavor == "BadgerFish") {
                    var text = child.nodeValue;
                    if (json["$"] === undefined)
                        json["$"] = text;
                    else 
                        json["$"] = json["$"] + text;
                }
            }
            child = child.nextSibling;
        }
    }

    /**
     * Convert an XML element to a object literal (JSON)
     * 
     * @param {Element|Document} xml the DOM element or document to convert to JSON
     * @param {string} flavor the JSON flavor: "SimpleJson" or "BadgerFish"
     * @returns {Object} an object literal corresponding to the XML element or document
     */
    static toJSON(xml, flavor) {
        if (xml === null || xml === undefined) return xml;
        flavor = flavor || "SimpleJson";
        if (flavor != "SimpleJson" && flavor != "BadgerFish")
            throw new Error(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
        if (xml.nodeType == 9)
            xml = xml.documentElement;
        var json = {};
        this._toJSON(xml, json, flavor);
        return json;
    }

}

// Public expots
exports.DomUtil = DomUtil;

