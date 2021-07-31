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

function DomUtil() {
}

/**
 * Parse an XML string as a DOM Document
 * @param {string} xmlString the string to parse
 * @returns {Document} the DOM document to the parsed string
 */
DomUtil.prototype.parse = function(xmlString) {
    const dom = new JSDOM(xmlString, {contentType: "text/xml"});
    const doc = dom.window.document;
    return doc;
}

DomUtil.prototype.newDocument = function(name) {
    const dom = new JSDOM('<' + name + '/>', {contentType: "text/xml"});
    return dom.window.document;
}

/**
 * Escapes a string for inserting as text in an XML element
 * @param {string} text the string to escape
 * @returns {string} the escaped string
 */
DomUtil.prototype.escapeXmlString = function(text) {
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
 * @param {Element} element the DOM element to search child node for
 * @param {string} tagName the element tag name to search for
 * @param {boolean} throws if true, will throw an error if element if not found. If not will return null
 * @returns the first child element with given name, or null if not found
 */
DomUtil.prototype.findElement = function(element, tagName, throws) {
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
 * @param {Element} node is the parent element from which we'll find the first child
 * @param {string} optionalNodeName is an optional tag name. If set, the first child with a matching name will be returned
 */
DomUtil.prototype.getFirstChildElement = function(node, optionalNodeName) {
    if (node === null || node === undefined) return null;
    var child = node.firstChild;
    while (child && (child.nodeType != 1 || (optionalNodeName !== undefined && child.nodeName !== optionalNodeName)))
        child = child.nextSibling;
    return child;
}

/**
 * Returns the text content of a node. If there are multiple content or cdata nodes, their content will
 * be concatenated. Text content of subnodes is not included
 * @param {Element} node the node to get content for
 * @returns {string} the text content
 */
DomUtil.prototype.elementValue = function(node) {
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

DomUtil.prototype.getNextSiblingElement = function(node, optionalNodeName) {
    if (node === null || node === undefined) return null;
    var sibling = node.nextSibling;
    while (sibling && (sibling.nodeType != 1 || (optionalNodeName !== undefined && sibling.nodeName !== optionalNodeName)))
        sibling = sibling.nextSibling;
    return sibling;
}

DomUtil.prototype.getAttributeAsString = function(node, name) {
    const attr = node.getAttribute(name);
    return XtkCaster.asString(attr);
}

DomUtil.prototype.getAttributeAsByte = function(node, name) {
    const attr = node.getAttribute(name);
    return XtkCaster.asByte(attr);
}

DomUtil.prototype.getAttributeAsBoolean = function(node, name) {
    const attr = node.getAttribute(name);
    return XtkCaster.asBoolean(attr);
}

DomUtil.prototype.getAttributeAsShort = function(node, name) {
    const attr = node.getAttribute(name);
    return XtkCaster.asShort(attr);
}

DomUtil.prototype.getAttributeAsLong = function(node, name) {
    const attr = node.getAttribute(name);
    return XtkCaster.asLong(attr);
}

DomUtil.prototype.toXMLString = function(node) {
    var s = "";
    if (node) {
        if (node.nodeType == 9) // documentElement
            node = node.documentElement;
        s = node.outerHTML;
    }
    return s;
}

DomUtil.prototype._fromJSON = function(doc, xmlRoot, jsonRoot, flavor) {
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
                var xmlElement = doc.createElement(att);
                xmlElement.textContent = value;
                xmlRoot.appendChild(xmlElement);
            }
            else if (t == "object") {
                if (value.length !== undefined && value.length !== null) {
                    for (var i=0; i<value.length; i++) {
                        var xmlElement = doc.createElement(att);
                        this._fromJSON(doc, xmlElement, value[i], flavor);
                        xmlRoot.appendChild(xmlElement);
                    }
                }
                else {
                    var xmlElement = doc.createElement(att);
                    this._fromJSON(doc, xmlElement, value, flavor);
                    xmlRoot.appendChild(xmlElement);
                }
            }
            else
                throw new Error(`Cannot cast JSON to XML: element '${att}' type '${t}' is unknown or not supported yet`);
        }
    }

}

DomUtil.prototype.fromJSON = function(docName, json, flavor) {
    flavor = flavor || "BadgerFish";
    if (flavor != "SimpleJson" && flavor != "BadgerFish")
        throw new Error(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
    if (!docName)
        throw new Error(`Cannot transform entity of flavor '${flavor}' to xml because no XML root name was given`);
    const doc = this.newDocument(docName);
    const root = doc.documentElement;
    this._fromJSON(doc, root, json, flavor);
    return doc;
}

DomUtil.prototype._toJSON = function(xml, json, flavor) {
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
         if (isArray && (json[childName].length === undefined || json[childName].length === null))
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
            else {

            }
        }
        child = child.nextSibling;
    }
}

DomUtil.prototype.toJSON = function(xml, flavor) {
    if (xml === null || xml === undefined) return xml;
    flavor = flavor || "BadgerFish";
    if (flavor != "SimpleJson" && flavor != "BadgerFish")
        throw new Error(`Invalid JSON flavor '${flavor}'. Should be 'SimpleJson' or 'BadgerFish'`);
    if (xml.nodeType == 9)
        xml = xml.documentElement;
    var json = {};
    this._toJSON(xml, json, flavor);
    return json;
}

exports.DomUtil = new DomUtil();    // static

