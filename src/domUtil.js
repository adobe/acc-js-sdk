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
    
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const { Util } = require("./util.js");

var JSDOM;

/* istanbul ignore else */
if (!Util.isBrowser()) {
    JSDOM = require("jsdom").JSDOM;
}

/**********************************************************************************
 * 
 * Browser-side implementation of jsdom node module. As the DOM is already
 * available in the browser, this is very light weight
 * 
 *********************************************************************************/
else {

  var jsdom = function(text) {
    var parser = new DOMParser();
    var dom = parser.parseFromString(text, "application/xml");
    this.window = {
        document: dom
    };
    this.serialize = function() {
        return new XMLSerializer().serializeToString(dom);
    };
  };
  
  JSDOM = jsdom;
}


/**********************************************************************************
 * 
 * DOM Utilities
 * 
 *********************************************************************************/

/**
 * @namespace XML
 */


/**
 * A dedicated class of object literals of class BadgerFish
 * Used to distinguish between the 2 JSON representations: BadgerFish & SimpleJson
 */

function _toBadgerFish(json) {
    if (!json) return json;

    if (Util.isArray(json)) {
        const result = [];
        for (const i of json)
            result.push(_toBadgerFish(i));
        return result;
    }
    if (typeof json == "object")
        return new BadgerFishObject(json);
    return json;
}

class BadgerFishObject {
    constructor(json) {
        for (const p in json) {
            this[p] = _toBadgerFish(json[p]);
        }
    }
}

class DomException {
    constructor(message) {
        this.message = message;
    }
}


/**
 * @memberof XML
 * @class
 * @constructor
 */
class DomUtil {

    /**
     * Helpers for common manipulation of DOM documents. Al functions are static, it is not necessary to create new instances of this object
     */
    constructor() {
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
            throw new DomException(`Node ${tagName} not found`);
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
                if ((t == "string" || t == "number" || t == "boolean") && att[0] != '$' && att[0] != '@') {
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
                    throw new DomException(`Cannot cast JSON to XML: attribute '${att}' type '${t}' is unknown or not supported yet`);
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
                else if (Util.isArray(value)) {
                    for (var i=0; i<value.length; i++) {
                        const xmlElement = doc.createElement(att);
                        this._fromJSON(doc, xmlElement, value[i], flavor);
                        xmlRoot.appendChild(xmlElement);
                    }
                }
                else if (t == "object") {
                    const xmlElement = doc.createElement(att);
                    this._fromJSON(doc, xmlElement, value, flavor);
                    xmlRoot.appendChild(xmlElement);
                }
                else
                    throw new DomException(`Cannot cast JSON to XML: element '${att}' type '${t}' is unknown or not supported yet`);
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
            throw new DomException(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
        if (!docName)
            throw new DomException(`Cannot transform entity of flavor '${flavor}' to xml because no XML root name was given`);
        const doc = this.newDocument(docName);
        const root = doc.documentElement;
        this._fromJSON(doc, root, json, flavor);
        return doc;
    }

    // Get the text of a node. Will return the text if the xml node contains
    // only text and cdata nodes. Otherwise will return null
    static _getTextIfTextNode(xml) {
        let child = xml.firstChild;
        if (!child) return null;                   // no children
        if (xml.hasAttributes()) return null;      // no attributes
        let text = "";
        while (child) {
            // if child node is not text or cdata, it means we have a mix
            // of text children and non-text children => we do not consider
            // the xml node to be a text-only node
            if (child.nodeType !== 3 && child.nodeType !== 4) 
                return null;
            text = text + child.nodeValue;
            child = child.nextSibling;
        }
        return text;
    }

    /**
     * Internal recursive method to convert an XML element to a object literal (JSON)
     * This function does not return anything. Instead it creates children elements in the passed 'json' object
     * 
     * @private
     * @param {Element} xml the DOM element to convert to JSON
     * @param {Object} json the object literal to write to
     * @param {string} flavor the JSON flavor: "SimpleJson" or "BadgerFish"
     * @param {Object} parentJson parent JSON node during recursion. Is undefined for first call
     * @param {boolean} forceTextAs is set during recursion (SimpleJson format) to force serialization of text nodes using "$: value" syntax 
     *                  instead of "$name: value" syntax. This is necessary to process collections and arrays of elements which only 
     *                  contain text nodes.
     */
    static _toJSON(xml, json, flavor, parentJson, forceTextAs$) {

        // Heuristic to determine if element is an object or an array
        const isCollection = xml.tagName.length > 11 && xml.tagName.substr(xml.tagName.length-11) == '-collection';

        // Figure out which elements are arrays. Keep a count of elements for each tag name.
        // When count >1 we consider this tag name to be an array
        var hasChildElements = false; // Will be set if there is at least one child element
        const countByTag = {};
        var child = xml.firstChild;
        while (child) {
            if (child.nodeType == 1) {
                const childName = child.nodeName;
                if (countByTag[childName] === undefined) countByTag[childName] = 1;
                else countByTag[childName] = countByTag[childName] + 1;
                hasChildElements = true;
            }
            child = child.nextSibling;
        }
        
        child = xml.firstChild;
        while (child) {
            if (child.nodeType == 1) {
                const childName = child.nodeName;
                const isArray = isCollection || countByTag[childName] > 1;
                if (isArray && !json[childName]) json[childName] = [];
                // In SimpleJson representation, ensure we have proper transformation
                // of text and CDATA nodes. For instance, the following
                //  <workflow><desc>Hello</desc></workflow>
                // should be transformed into { "$desc": "Hello" }
                // Note that an empty element such as
                //  <workflow><desc></desc></workflow>
                // will be transformed into { "desc": {} }
                // because there is an ambiguity and, unless we have information
                // from the schema, we cannot know if <desc></desc> should be
                // transformed into "$desc": "" or into "desc": {}
                const text = this._getTextIfTextNode(child);
                if (!isArray && text !== null && flavor == "SimpleJson") {
                    json[`$${childName}`] = text;
                }
                else {
                    const jsonChild = flavor == "BadgerFish" ? new BadgerFishObject() : {};
                    this._toJSON(child, jsonChild, flavor, json, isArray);
                    if (isArray) 
                        json[childName].push(jsonChild);
                    else
                        json[childName] = jsonChild;
                }
            }
            else if (child.nodeType === 3 || child.nodeType === 4) { // text and CDATA
                if (flavor == "BadgerFish") {
                    const text = child.nodeValue;
                    if (json.$ === undefined)
                        json.$ = text;
                    else 
                        json.$ = json.$ + text;
                }
            }
            child = child.nextSibling;
        }

        // Proceed with text nodes in SimpleJson format. 
        if (flavor === "SimpleJson") {
            var text = "";
            child = xml.firstChild;
            while (child) {
                if (child.nodeType === 3) { // text 
                    var nodeText = child.nodeValue;
                    // Whitespace trimming rule: always trim for the root node, and trim for non-root nodes
                    // which actually have children elements
                    // Never trim CDATA nodes (nodeType 4)
                    if (!parentJson || hasChildElements)
                        nodeText = nodeText.trim(); 
                    if (nodeText) text = text + nodeText;
                }    
                else if (child.nodeType === 4) { // CDATA    
                    const cdataText = child.nodeValue;
                    if (cdataText) text = text + cdataText;
                }    
                child = child.nextSibling;
            }
            if (text) {
                json.$ = text;
            }
        }

        // Finally proceed with attributes. They are processed last so that we get a chance to prefix
        // the attribute name with "@" in SimpleJson format if there's already an element with the
        // same name
        if (xml.hasAttributes()) {
            const attributes = xml.attributes;
            for (var i=0; i<attributes.length; i++) {
                const att = attributes[i];
                var attName = (flavor == "BadgerFish" ? "@" : "") + att.name;
                if (json[attName] !== undefined && flavor === "SimpleJson")
                    // There's already an element with the same name as the attribute
                    attName = "@" + attName;
                json[attName] = att.value;
            }
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
            throw new DomException(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
        if (xml.nodeType == 9)
            xml = xml.documentElement;
            var json = flavor == "BadgerFish" ? new BadgerFishObject() : {};
            this._toJSON(xml, json, flavor);
            return json;
    }

}



// ========================================================================================
// XPath
// This is currently an internal helper structure
//
// A XPath can be either of:
//      - null, undefined or empty, which represents a relative path to self
//      - "." a relative path to self
//      - ".." a relative path to the parent node
//      - "/" a absolute path to the top level node (the schema node)
//      - A "/" separate list of path elements, optionally starting with "/" to indicate an absolute xpath
//
// XPathElement
// This is currently an internal helper structure
//
// An XPathElement represents an element in a XPath. It can never be null, undefined or empty
// (this should not be possible by construction as XPath elements are created from the XPath
// object)
//      - A attribute name, starting with "@"
//      - An element name
// 
// ========================================================================================

/**
 * Represents an element of a XPath
 * 
 * @private
 * @class
 * @constructor
 * @param {string} pathElement the element as a string
 * @memberof XML
 */
class XPathElement {
    
    constructor(pathElement) {
        if (pathElement == null || pathElement == undefined || pathElement.trim() == "")
            throw new DomException(`Invalid empty xpath element`);
        this._pathElement = pathElement;
    }

    /**
     * Tests if the XPath element represents the current node ("self" or ".")
     * @returns {boolean} a boolean indicating if the element represents the current node
     */
    isSelf() {
        return this._pathElement == ".";
    }

    /**
     * Tests if the XPath element represents the parent node ("..")
     * @returns {boolean} a boolean indicating if the element represents the parent node
     */
    isParent() {
        return this._pathElement == "..";
    }

    /**
     * Get the string representation of the XPath element
     * @returns {string} the XPath element as a string
     */
    asString() {
        return this._pathElement;
    }

    toString() {
        return this.asString();
    }
}

/**
 * Represents a XPath
 * 
 * @private
 * @class
 * @constructor
 * @param {string} path the XPath, as a string
 * @memberof XML
 */
class XPath {

    constructor(path) {
        path = (path || "").trim();
        if (path && path.startsWith("[") && path.endsWith("]"))
            path = path.substring(1, path.length - 1).trim();
        this._path = path;
    }

    /**
     * Get the string representation of the XPath
     * @returns {string} the XPath as a string
     */
    asString() {
        return this._path;
    }

    toString() {
        return this.asString();
    }

    /**
     * Tests if the XPath is empty ("")
     * @returns {boolean} a boolean indicating whether the XPath is empty or not
     */
    isEmpty() {
        return this._path.length == 0;
    }

    /**
     * Tests if the XPath is an absolute XPath (starts with "/")
     * @returns {boolean} a boolean indicating whether the XPath is an absolute XPath or not
     */
    isAbsolute() {
        return this._path.length > 0 && this._path[0] == '/';
    }

    /**
     * Tests if the XPath represents the current node ("self" or ".")
     * @returns {boolean} a boolean indicating whether the XPath is the current node
     */
    isSelf() {
        return this._path == ".";
    }

    /**
     * Tests if the XPath represents the root node ("/")
     * @returns {boolean} a boolean indicating whether the XPath is the root node
     */
    isRootPath() {
        return this._path == "/";
    }

    /**
     * Get an array of the elements making up the path
     * @returns {XPathElement[]} an array of XPath elements, which may be empty. Will never be null or undefined.
     */
    getElements() {
        const elements = [];
        const first = this.isAbsolute() ? 1 : 0;
        const path = this._path.substr(first);
        if (path != "") {
            const tokens = path.split('/');
            for (var i=0; i<tokens.length; i++) {
                const element = new XPathElement(tokens[i]);
                elements.push(element);
            }
        }
        return elements;
    }

    /**
     * Get an XPath representing a relative path corresponding to the path. In other words, removing
     * the starting "/" if there is one
     * @returns {XPath} the relative XPaht
     */
    getRelativePath() {
        if (!this.isAbsolute()) return this;
        return new XPath(this._path.substring(1));
    }
}

// Public expots
exports.DomUtil = DomUtil;
exports.DomException = DomException;
exports.BadgerFishObject = BadgerFishObject;
exports.XPath = XPath;
exports.XPathElement = XPathElement;

})();
