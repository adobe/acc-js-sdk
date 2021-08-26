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
 * SDK "application" object
 * https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Application.html
 * 
 *********************************************************************************/
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const EntityAccessor = require('./entityAccessor.js').EntityAccessor;
 

// ========================================================================================
// Helper functions
// ========================================================================================
 
// Determine if a name is an attribute name, i.e. if it starts with the "@" character
isAttributeName = function(name) { return name.length > 0 && name[0] == '@'; }


/**
  * Creates a schema object
  * 
  * @param {DOMElement|DOMDocument} xml the XML document or element representing the schema
  * @returns {Schema} a schema object
  */
function newSchema(xml) {
    if (xml.nodeType == 9) xml = xml.documentElement;       // Document -> element
    var schema = new XtkSchema(xml);
    return schema;
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

function XPathElement(pathElement) {
    if (pathElement == null || pathElement == undefined || pathElement.trim() == "")
        throw new Error(`Invalid empty xpath element`);
    this._pathElement = pathElement;
}

XPathElement.prototype.isSelf = function() {
    return this._pathElement == ".";
}

XPathElement.prototype.isParent = function() {
    return this._pathElement == "..";
}

XPathElement.prototype.asString = function() {
    return this._pathElement;
}

XPathElement.prototype.toString = function() {
    return this.asString();
}

function XPath(path) {
    this._path = (path || "").trim();
}

XPath.prototype.asString = function() {
    return this._path;
}

XPath.prototype.toString = function() {
    return this.asString();
}

XPath.prototype.isEmpty = function() {
    return this._path.length == 0;
}

XPath.prototype.isAbsolute = function() {
    return this._path.length > 0 && this._path[0] == '/';
}

XPath.prototype.isSelf = function() {
    return this._path == ".";
}

XPath.prototype.isRootPath = function() {
    return this._path == "/";
}

/**
 * Get an array of the elements making up the path
 * @returns {XPathElement[]} an array of XPath elements, which may be empty. Will never be null or undefined.
 */
XPath.prototype.getElements = function() {
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
 * @returns {XPath}
 */
XPath.prototype.getRelativePath = function() {
    if (!this.isAbsolute()) return this;
    return new XPath(this._path.substring(1));
}

// ========================================================================================
// Keys
// ========================================================================================

XtkSchemaKey = function(schema, xml, schemaNode) {
    this.schema = schema;
    this.name = EntityAccessor.getAttributeAsString(xml, "name");
    this.label = EntityAccessor.getAttributeAsString(xml, "label");
    this.description = EntityAccessor.getAttributeAsString(xml, "desc");
    this.isInternal = EntityAccessor.getAttributeAsString(xml, "internal");
    this.allowEmptyPart = EntityAccessor.getAttributeAsString(xml, "allowEmptyPart");
    this.fields = {};

    for (child of EntityAccessor.getChildElements(xml, "keyfield")) {
        const xpath = EntityAccessor.getAttributeAsString(child, "xpath");
        if (xpath == "") throw new Error(`Cannot create XtkSchemaKey for key '${this.name}': keyfield does not have an xpath attribute`);
        const field = schemaNode.findNode(xpath);
        this.fields[field.name] = field;
    }
}

// ========================================================================================
// Schema nodes
// ========================================================================================

XtkSchemaNode = function(schema, xml, parentNode, isAttribute) {
    this.schema = schema;
    this.parent = parentNode;
    this.isAttribute = isAttribute;
    this.name = (this.isAttribute ? "@" : "") + EntityAccessor.getAttributeAsString(xml, "name");
    this.label = EntityAccessor.getAttributeAsString(xml, "label");
    this.description = EntityAccessor.getAttributeAsString(xml, "desc");
    this.img = EntityAccessor.getAttributeAsString(xml, "img");
    this.type = EntityAccessor.getAttributeAsString(xml, "type");
    this.length = EntityAccessor.getAttributeAsLong(xml, "length");
    this.ref = EntityAccessor.getAttributeAsString(xml, "ref");
    this.children = {};
    this.childrenCount = 0;
    this.isRoot = this.parent && !this.parent.parent && this.parent.name == this.name;
    this.userDescription = (this.label == "" || this.label == this.name) ? this.name : `${this.label} (${this.name})`;
    this.keys = {};
    this.nodePath = this._getNodePath(true)._path;

    // Children (elements and attributes)
    const childNodes = [];
    for (child of EntityAccessor.getChildElements(xml, "attribute")) {
        childNodes.push(new XtkSchemaNode(schema, child, this, true));
    }
    for (child of EntityAccessor.getChildElements(xml, "element")) {
        childNodes.push(new XtkSchemaNode(schema, child, this, false));
    }
    for (childNode of childNodes) {
        if (this.children[childNode.name]) {
            // already a child with the name => there's a problem with the schema
            throw new Error(`Failed to create schema node '${childNode.name}': there's a already a node with this name`);
        }
        this.children[childNode.name] = childNode;
        this.childrenCount = this.childrenCount + 1;
    }

    // Keys (after elements and attributes have been found)
    for (child of EntityAccessor.getChildElements(xml, "key")) {
        const key = new XtkSchemaKey(schema, child, this);
        this.keys[key.name] = key;
    }
}

XtkSchemaNode.prototype.hasChild = function(name) {
    var child = this.children[name];
    if (child) return true;
    // TODO: handle ref target
//    if (this.hasRefTarget())
//        return this.refTarget().hasChild(name);
    return false;
}

// Return node path in schema definition
// See CXtkNodeDef::GetNodePath
XtkSchemaNode.prototype._getNodePath = function(absolute) {
    if (absolute === undefined) absolute = true;
    var path = !this.parent ? this.name : "";
    var schemaName = this.schema.name;
    var node = this;
    while (node && node.parent) {
        if (path != "") path = `/${path}`;
        if (node.parent.parent || node.name != schemaName)
            path = `${node.name}${path}`;
        node = node.parent;
    }
    if (absolute) {
        if (path == "") path = "/";
        else if (!path.startsWith("/")) path = `/${path}`;
    }
    else {
        if (path.startsWith("/")) path = path.substring(1);
    }
    return new XPath(path);
}


/**
 * Returns an instance of XtkSchemaNode or null if the node doesn't exist and the mustExist parameter is set to false.
 *
 * @param {XPath|string} path XPath represents the name of the node to be searched
 * @param {boolean} strict indicates whether (strict to false) or not, when the name of the last item in the path does not exist as is, it should be searched for as an attribute or an element. By default to true.
 * @param {boolean} mustExist indicates whether an exception must be raised if the node does not exist. true by default
 * @returns Returns a XtkSchemaNode instance if the node can be found, or null if the mustExist parameter is set to false.
 
*/
XtkSchemaNode.prototype.findNode = function(path, strict, mustExist) {
    if (strict === undefined) strict = true;
    if (mustExist === undefined) mustExist = true;
    if (typeof path == "string")
        path = new XPath(path);

    // Find the starting node
    var node = this;
    if (path.isEmpty() || path.isAbsolute()) {
        node = this.schema.root;
        if (!node)
            throw new Error(`Cannot find node '${path}' in node ${this.name} : schema ${this.schema.name} does not have a root node`);
        path = path.getRelativePath();
    }

    // Special case for current path "."
    if (path.isSelf())
        return this;

    const elements = path.getElements();
    while (node && elements.length > 0) {
        const element = elements.shift();
        var name = element.asString();

        // TODO: if the path is a collection path, ignore the collection index
        // TODO: handle ref elements (consider the ref target instead)
        // TODO: Handle link between schemas
        // TODO: Handle any type
        
        if (!strict && elements.length == 0 && (!node.children[name] || !isAttributeName(name))) {
            // name is the final part of the path and the associated definition
            // does not exists. Since strict is set to false we check if the
            // alternate name exists (element name for an attribute or attribute
            // name for an element).
            var found = node.children[name];
            if (!found && isAttributeName(name)) found = node.children[name.substring(1)];
            if (!found && !isAttributeName(name)) found = node.children[`@${name}`];
            if (found) name = found.name;
        }

        var childNode = null;
        if (element.isSelf()) 
            childNode = node;
        else if (element.isParent())
            childNode = node.parent;
        else
            childNode = node._getChildDefAutoExpand(name, mustExist)
        node = childNode;
    }
    return node;
}

// See CXtkNodeDef::GetChildDefAutoExpand
XtkSchemaNode.prototype._getChildDefAutoExpand = function(name, mustExist) {
    var child = this.children[name];
    if (child)
        return child;
    
    // TODO: handle ref

    if (mustExist) {    
        // TODO: handle auto-expand schemas
        const path = this._getNodePath();
        const isAttribute = isAttributeName(name);
        const schemaDesc = this.schema.userDescription;
        if( path.isRootPath() ) {
            if (isAttribute) throw new Error(`Unknown attribute '${name.substring(1)}' (see definition of schema '${schemaDesc}').`);
            else throw new Error(`Unknown element '${name}' (see definition of schema '${schemaDesc}').`);
        }
        if (isAttribute) throw new Error(`Unknown attribute '${name.substring(1)}' (see definition of element '${path.asString()}' in schema '${schemaDesc}').`);
        else throw new Error(`Unknown element '${name}' (see definition of element '${path.asString()}' in schema '${schemaDesc}').`);
    }

    return null;
}

// ========================================================================================
// Enumerations
// ========================================================================================

function XtkEnumerationValue(xml, baseType) {
    this.name = EntityAccessor.getAttributeAsString(xml, "name");
    this.label = EntityAccessor.getAttributeAsString(xml, "label");
    this.description = EntityAccessor.getAttributeAsString(xml, "desc");
    this.image = EntityAccessor.getAttributeAsString(xml, "img");
    this.enabledIf = EntityAccessor.getAttributeAsString(xml, "enabledIf");
    this.applicableIf = EntityAccessor.getAttributeAsString(xml, "applicableIf");
    const stringValue = EntityAccessor.getAttributeAsString(xml, "value");
    this.value = XtkCaster.as(stringValue, baseType);
}

function XtkEnumeration(xml) {
    this.name = EntityAccessor.getAttributeAsString(xml, "name");
    this.label = EntityAccessor.getAttributeAsString(xml, "label");
    this.description = EntityAccessor.getAttributeAsString(xml, "desc");
    this.baseType = EntityAccessor.getAttributeAsString(xml, "basetype");
    this.default = null;
    this.hasImage = false;
    this.values = {};

    var defaultValue = EntityAccessor.getAttributeAsString(xml, "default");

    for (child of EntityAccessor.getChildElements(xml, "value")) {
        const e = new XtkEnumerationValue(child, this.baseType);
        this.values[e.name] = e;
        if (e.image != "") this.hasImage = true;
        const stringValue = EntityAccessor.getAttributeAsString(child, "value");
        if (defaultValue == stringValue)
            this.default = e;
    }
}

// ========================================================================================
// Schemas
// ========================================================================================

function XtkSchema(xml) {
    XtkSchemaNode.call(this, this, xml);          // inherits from NodeDef
    this.namespace = EntityAccessor.getAttributeAsString(xml, "namespace");
    this.id = `${this.namespace}:${this.name}`;
    this.isLibrary = EntityAccessor.getAttributeAsBoolean(xml, "library");
    this.labelSingular = EntityAccessor.getAttributeAsString(xml, "labelSingular");
    this.mappingType = EntityAccessor.getAttributeAsString(xml, "mappingType");
    this.xml = xml;
    this.root = this.children[this.name];
    this.enumerations = {};

    for (child of EntityAccessor.getChildElements(xml, "enumeration")) {
        const e = new XtkEnumeration(child);
        this.enumerations[e.name] = e;
    }
}

XtkSchema.prototype = Object.create(XtkSchemaNode.prototype);

XtkSchemaNode.prototype.toString = function(indent) {
    indent = indent || "";
    var s = `${indent}${this.userDescription}\n`;
    for (var name in this.children) {
        s = s + this.children[name].toString(`   ${indent}`);
    }
    return s;
}

XtkSchema.prototype.toString = function() {
    var s =  `${this.userDescription}\n`;
    //s = s + `   enumerations: [${enumerations}]`
    for (var name in this.children) {
        s = s + this.children[name].toString("    - ");
    }
    return s;
}


// ========================================================================================
// Current Login
// ========================================================================================

function CurrentLogin(userInfo) {
    this.login = EntityAccessor.getAttributeAsString(userInfo, "login");
    this.id = EntityAccessor.getAttributeAsLong(userInfo, "loginId");
    this.computeString = EntityAccessor.getAttributeAsString(userInfo, "loginCS");
    this.timezone = EntityAccessor.getAttributeAsString(userInfo, "timezone");
    this.rights = [];
    this._rightsSet = {};
    for (child of EntityAccessor.getChildElements(userInfo, "login-right")) {
        const right = EntityAccessor.getAttributeAsString(child, "right");
        this.rights.push(right);
        this._rightsSet[right] = true;
    }
}

CurrentLogin.prototype.hasRight = function(name) {
    return !!this._rightsSet[name];
}

// For testing
function newCurrentLogin(userInfo) {
    return new CurrentLogin(userInfo);
}

// ========================================================================================
// Application
// ========================================================================================

function Application(client) {
    this.client = client;
    const info = this.client.getSessionInfo();
    // When using "SessionToken" authentication, there is no actual logon, and therefore
    // no "sessionInfo" object
    if (info) {
        const serverInfo = EntityAccessor.getElement(info, "serverInfo");
        this.buildNumber = EntityAccessor.getAttributeAsString(serverInfo, "buildNumber");
        this.instanceName = EntityAccessor.getAttributeAsString(serverInfo, "instanceName");
        const userInfo = EntityAccessor.getElement(info, "userInfo");
        this.operator = new CurrentLogin(userInfo);
        this.packages = [];
        for (var p of EntityAccessor.getChildElements(userInfo, "installed-package")) {
            this.packages.push(`${EntityAccessor.getAttributeAsString(p, "namespace")}:${EntityAccessor.getAttributeAsString(p, "name")}`);
        }
    }
}

/**
 * Get a schema by id. This function returns an XtkSchema object or null if the schema is not found.
 * Using the `XtkSchema` API makes it easier to navigate schemas than using a plain XML or JSON object
 * @param {string} schemaId 
 * @returns {XtkSchema} the schema, or null if the schema was not found
 */
Application.prototype.getSchema = async function(schemaId) {
    const xml = await this.client.getSchema(schemaId, "xml");
    if (!xml)
        return null;
    return newSchema(xml);
}

Application.prototype.hasPackage = function(name) {
    for (var p of this.packages) {
        if (p == name) return true;
    }
    return false;
}


/**
 * Public exports
 */
exports.Application = Application;

// For tests
exports.newSchema = newSchema;
exports.newCurrentLogin = newCurrentLogin;
exports.XPath = XPath;
exports.XPathElement = XPathElement;
