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
 * SOAP calls wrapper
 * 
 * 
 *      const SoapMethodCall = require('./soap.js').SoapMethodCall;
 * 
 * Creates a SOAP call, passing it a session token and security token.
 * The tokens can be obtained with the xtk:session:Logon call
 * 
 *     const soapCall = new SoapMethodCall("xtk:session", "GetOption", sessionToken, securityToken);
 * 
 * Fill in input parameters, using the write* functions according to their type
 * 
 *      soapCall.writeString("param1", "value1");
 *      ...
 * 
 * Executes the SOAP call
 * 
 *      promise = soapCall.execute("http://ffdamkt:8080/nl/jsp/soaprouter.jsp")
 * 
 * Once the promise is resolved, extract results according to their type
 * 
 *      const value1 = soapCall.getNextString();
 * 
 * Check that all results have been read
 * 
 *      soapCall.checkNoMoreArgs();
 * 
 * 
 *********************************************************************************/

const DomUtil = require('./dom.js').DomUtil;
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const request = require('request-promise-native');
const JSDOM = require("jsdom").JSDOM;

const SOAP_ENCODING_NATIVE = "http://schemas.xmlsoap.org/soap/encoding/";
const SOAP_ENCODING_XML = "http://xml.apache.org/xml-soap/literalxml";
const NS_ENV = "http://schemas.xmlsoap.org/soap/envelope/";
const NS_XSI = "http://www.w3.org/2001/XMLSchema-instance";
const NS_XSD = "http://www.w3.org/2001/XMLSchema";


function CampaignException(call, statusCode, faultCode, faultString, detail, cause) {

    var methodCall = undefined;
    var methodName = undefined;
    if (call instanceof SoapMethodCall) {
        methodCall = {
            type: "SOAP",
            urn: call.urn,
            methodName: call.methodName,
            request: call.request,
            response: call.response
        };
        methodName = `${call.urn}#${call.methodName}`;
    }
    else {
        // HTTP call
        const index = call.request.url.indexOf('/');
        const path = index == -1 ? call.request.url : call.request.url.substring(index+1);
        methodCall = {
            type: "HTTP",
            urn: "",
            methodName: path,
            request: call.request,
            response: call.response
        };
        methodName = path;
    }

    faultString = faultString || "";
    if (faultString == "null" || faultString == "null\n") faultString = "";
    detail = detail || "";
    faultCode = faultCode || "";
    if (statusCode == 403 && faultString == "")
        faultString = "Forbidden";

    var errorMessage = "No error message was provided";
    if (faultString != "" && detail != "")
        errorMessage = `${faultString}. ${detail}`;
    else if (faultString != "")
        errorMessage = faultString;
    else  if (detail != "")
        errorMessage = detail;

    var message = `${statusCode} - Error${faultCode == "" ? "" : faultCode} calling method '${methodName}': ${errorMessage}`;

    // Extract Campaign error code. For instance, the fault string may look like
    // "XSV-350013 The '193.104.215.11' IP address via which...", we extract the "XSV-350013" code
    var errorCode = "";
    const match = faultString.match(/(\w{3}-\d{6}) (.*)/);
    if (match && match.length >= 2) {
        errorCode = match[1];
        faultString = match[2];
    }

    this.name = "CampaignException";
    this.message = message;
    this.statusCode = statusCode;
    this.methodCall = methodCall;
    this.errorCode = errorCode;
    this.faultCode = faultCode;
    this.faultString = faultString;
    this.detail = detail;
    this.stack = (new Error()).stack;
    this.cause = cause;
}

function makeCampaignException(call, err) {
    if (err instanceof CampaignException)
        return err;
    const ctor = err.__proto__.constructor;
    if (ctor && ctor.name == "DOMException") {
        return new CampaignException(call, 500, err.code, `DOMException (${err.name})`, err.message, err);
    }
    const statusCode = err.statusCode || 500;
    var error = err.error || err.message;
    if (ctor && ctor.name && ctor.name != "")
        error = `${ctor.name} (${error})`;
    // TODO: this is depending on the "request" library. Should abstract this away
    return new CampaignException(call, statusCode, "", error, undefined, err);
}

  

/**
 * Creates a SOAP call object
 * @param {String} urn Campaign method namespace, ex: "xtk:session"
 * @param {String} methodName Method name, ex: "Logon"
 * @param {String} sessionToken Campaign session token
 * @param {String} securityToken  Campaign security token
 * @param {String} userAgentString The user agent string to use for HTTP requests
 */
function SoapMethodCall(urn, methodName, sessionToken, securityToken, userAgentString) {
    this.sessionToken = sessionToken || "";
    this.securityToken = securityToken || "";
    this.userAgentString = userAgentString;
    this._initMessage(urn, methodName, SOAP_ENCODING_NATIVE);

    // Current DOM element for reading result (getNext* functions) 
    this.elemCurrent = undefined;

    // Current URN and method (for error reporting)
    this.urn = urn;
    this.methodName = methodName;

    // Transport (request or mock)
    this.transport = request;
}

// Initialze SOAP message
SoapMethodCall.prototype._initMessage = function(urn, method, encoding) {
    this.urn = urn;
    this.methodName = method;
    this.encoding = encoding;
    var urnPath = "urn:" + urn;

    this.dom = new JSDOM(`<?xml version='1.0' encoding='UTF-8'?><SOAP-ENV:Envelope xmlns:xsd='${NS_XSD}' xmlns:xsi='${NS_XSI}' xmlns:SOAP-ENV='${NS_ENV}' xmlns:ns='http://xml.apache.org/xml-soap'></SOAP-ENV:Envelope>`, {contentType: "text/xml"});
    this.doc = this.dom.window.document;
    this.root = this.doc.documentElement;

    this.header = this.doc.createElement(`SOAP-ENV:Header`);
    this.root.appendChild(this.header);

    this.body = this.doc.createElement(`SOAP-ENV:Body`);
    this.root.appendChild(this.body);

    this.method = this.doc.createElement(`m:${method}`);
    this.method.setAttribute(`xmlns:m`, urnPath);
    this.method.setAttribute(`SOAP-ENV:encodingStyle`, encoding);
    this.body.appendChild(this.method);

    const cookieHeader = this.doc.createElement("Cookie");
    cookieHeader.textContent = `__sessiontoken=${this.sessionToken}`;
    this.header.appendChild(cookieHeader);

    const securityTokenHeader = this.doc.createElement("X-Security-Token");
    securityTokenHeader.textContent = this.securityToken;
    this.header.appendChild(securityTokenHeader);

    this.writeString("sessiontoken", this.sessionToken);
}

/**
 * Adds a XML parameter to the SOAP call being built
 * @param {string} tag the node tag name, i.e. the parameter name. Example: "sessiontoken", "login", etc.
 * @param {string} type the SOAP parameter type, ex: "xsd:string"
 * @param {*} value the parameter value
 * @param {string} encoding the parameter encoding (optional) : SOAP_ENCODING_NATIVE or SOAP_ENCODING_XML
 * @returns the XML element to be added to the SOAP call
 */
SoapMethodCall.prototype._addNode = function(tag, type, value, encoding) {
    const node = this.doc.createElement(tag);
    node.setAttribute("xsi:type", type);
    if (encoding != this.encoding)
        node.setAttribute("SOAP-ENV:encodingStyle", encoding);
    if (value !== null && value !== undefined)
        node.textContent = value;
    this.method.appendChild(node);
    return node;
}

/**
 * Sets a byte-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a byte according to xtk rules
 */
SoapMethodCall.prototype.writeByte = function(tag, value) {
    value = XtkCaster.asByte(value);
    this._addNode(tag, "xsd:byte", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a boolean-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a boolean according to xtk rules
 */
SoapMethodCall.prototype.writeBoolean = function(tag, value) {
    value = XtkCaster.asBoolean(value);
    this._addNode(tag, "xsd:boolean", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a short-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a short according to xtk rules
 */
SoapMethodCall.prototype.writeShort = function(tag, value) {
    value = XtkCaster.asShort(value);
    this._addNode(tag, "xsd:short", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a int32-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a int32 according to xtk rules
 */
 SoapMethodCall.prototype.writeLong = function(tag, value) {
    value = XtkCaster.asLong(value);
    this._addNode(tag, "xsd:int", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a int64-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a int64 according to xtk rules
 */
 SoapMethodCall.prototype.writeInt64 = function(tag, value) {
    value = XtkCaster.asInt64(value);
    this._addNode(tag, "xsd:long", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a float-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a float according to xtk rules
 */
SoapMethodCall.prototype.writeFloat = function(tag, value) {
    value = XtkCaster.asNumber(value);
    this._addNode(tag, "xsd:float", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a double-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a double according to xtk rules
 */
SoapMethodCall.prototype.writeDouble = function(tag, value) {
    value = XtkCaster.asNumber(value);
    this._addNode(tag, "xsd:double", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a string-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a string according to xtk rules
 */
SoapMethodCall.prototype.writeString = function(tag, value) {
    value = XtkCaster.asString(value);
    this._addNode(tag, "xsd:string", value, SOAP_ENCODING_NATIVE);
}

/**
 * Sets a timestamp-type parameter
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a timestamp according to xtk rules
 */
SoapMethodCall.prototype.writeTimestamp = function(tag, value) {
    value = XtkCaster.asTimestamp(value);
    this._addNode(tag, "xsd:datetime", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a date-type parameter (no hour part)
 * @param {string} tag the parameter name
 * @param {*} value the parameter value, which will be casted to a date according to xtk rules
 */
SoapMethodCall.prototype.writeDate = function(tag, value) {
    value = XtkCaster.asDate(value);
    this._addNode(tag, "xsd:date", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
}

/**
 * Sets a XML element-type parameter. See createElement method to create such an element
 * @param {string} tag the parameter name
 * @param {Element} value the parameter value (XML element)
 */
SoapMethodCall.prototype.writeElement = function(tag, element) {
    const node = this._addNode(tag, "ns:Element", null, SOAP_ENCODING_XML);
    if (element !== null && element !== undefined) {
        const child = this.doc.importNode(element, true);
        node.appendChild(child);
    }
}

/**
 * Sets a XML document-type parameter
 * @param {string} tag the parameter name
 * @param {Document} value the parameter value (XML document)
 */
SoapMethodCall.prototype.writeDocument = function(tag, document) {
    const node = this._addNode(tag, "", null, SOAP_ENCODING_XML);
    if (document !== null && document !== undefined) {
        const child = this.doc.importNode(document.documentElement, true);
        node.appendChild(child);
    }
}

// Verifies that a returned value matches an expected type
// This will check that the current element (which is the XML element for current returned value) matches the passed type
SoapMethodCall.prototype._checkTypeMatch = function(type) {
    if (this.elemCurrent === null || this.elemCurrent === undefined) {
        throw new CampaignException(this, 400, `Missing parameter for method '${this.methodName}' of urn '${this.urn}'`);
    } else if ( type != "ns:Document") {
        var xsiType = this.elemCurrent.getAttribute("xsi:type");
        if (xsiType === null || xsiType === undefined || xsiType !== type) {
            throw new CampaignException(this, 400, `Parameter type mismatch for method '${this.methodName}' of urn '${this.urn}'. Expected '${type}', got '${xsiType}'`);
        }
    }
}

/**
 * In Campaign, non static SOAP calls may return an "entity" DOM Element, which corresponds to the object on which
 * the method is called. A good example is the xtk:queryDef#SelectAll API call: the method definition does not have
 * any return parameters, but it still returns an <entity> element contains the queryDef with all select nodes.
 * 
 * @returns the Entity DOM Element if there's one, or null if there isn't. The currentElement pointer will be 
 * updated accordingly
 */
SoapMethodCall.prototype.getEntity = function() {
    if (!this.elemCurrent)
        return null;
    if (this.elemCurrent.getAttribute("xsi:type") != "ns:Element")
        return null;
    if (this.elemCurrent.tagName != "entity")
        return null;
    var entity = this.elemCurrent;
    entity = DomUtil.getFirstChildElement(entity);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return entity;
}

/**
 * Extracts the next result value as a string
 * @returns {string} the string result value
 */
SoapMethodCall.prototype.getNextString = function() {
    this._checkTypeMatch("xsd:string");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return value;
}

/**
 * Extracts the next result value as a boolean
 * @returns {number} the boolean result value
 */
SoapMethodCall.prototype.getNextBoolean = function() {
    this._checkTypeMatch("xsd:boolean");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asBoolean(value);
}

/**
 * Extracts the next result value as a byte
 * @returns {number} the byte result value
 */
SoapMethodCall.prototype.getNextByte = function() {
    this._checkTypeMatch("xsd:byte");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asByte(value);
}

/**
 * Extracts the next result value as a short
 * @returns {number} the short result value
 */
SoapMethodCall.prototype.getNextShort = function() {
    this._checkTypeMatch("xsd:short");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asShort(value);
}

/**
 * Extracts the next result value as an int32 (xtk long)
 * @returns {number} the int32 result value
 */
SoapMethodCall.prototype.getNextLong = function() {
    this._checkTypeMatch("xsd:int");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asLong(value);
}

/**
 * Extracts the next result value as a 64 bit integer
 * Will be returned as a string to ensure no precision is lost
 * @returns {string} the int64 result value as a string
 */
SoapMethodCall.prototype.getNextInt64 = function() {
    this._checkTypeMatch("xsd:long");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return value;
}

/**
 * Extracts the next result value as an float
 * @returns {number} the float result value
 */
SoapMethodCall.prototype.getNextFloat = function() {
    this._checkTypeMatch("xsd:float");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asFloat(value);
}

/**
 * Extracts the next result value as an double
 * @returns {number} the double result value
 */
SoapMethodCall.prototype.getNextDouble = function() {
    this._checkTypeMatch("xsd:double");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asDouble(value);
}

/**
 * Extracts the next result value as a timestamp
 * @returns {Date} the timestamp result value
 */
SoapMethodCall.prototype.getNextDateTime = function() {
    this._checkTypeMatch("xsd:dateTime");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asTimestamp(value);
}

/**
 * Extracts the next result value as a date (no hour part)
 * @returns {Date} the date result value
 */
SoapMethodCall.prototype.getNextDate = function() {
    this._checkTypeMatch("xsd:date");
    var value = DomUtil.elementValue(this.elemCurrent);
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return XtkCaster.asDate(value);
}

/**
 * Extracts the next result value as an XML document
 * @returns {Document} the XML document result value
 */
SoapMethodCall.prototype.getNextDocument = function() {
    this._checkTypeMatch("ns:Document");
    var elemValue = DomUtil.getFirstChildElement(this.elemCurrent);
    if (elemValue === null || elemValue === undefined) {
        this.elemValue = null;
        return null;
    } 
    var docValue = elemValue;
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return docValue;
}

/**
 * Extracts the next result value as an XML element
 * @returns {Element} the XML element result value
 */
SoapMethodCall.prototype.getNextElement = function() {
    this._checkTypeMatch("ns:Element");
    var elemValue = DomUtil.getFirstChildElement(this.elemCurrent);
    if (elemValue === null || elemValue === undefined) {
        this.elemValue = null;
        return null;
    } 
    this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
    return elemValue;
}

/**
 * Checks that all return values have been consumed (with one of the getNext* functions)
 * @returns a boolean set to true if ther are no more response args to read
 */ 
SoapMethodCall.prototype.checkNoMoreArgs = function() {
    return !this.elemCurrent
}

// Generates "options" object for HTTP request
SoapMethodCall.prototype._createHTTPRequest = function(url) {
    const options = {
        url: url,
        method: 'POST',
        headers: {
            'Content-type': 'application/soap+xml',
            'User-Agent': this.userAgentString,
            'SoapAction': `${this.urn}#${this.methodName}`,
            'X-Security-Token': this.securityToken,
            'Cookie': '__sessiontoken=' + this.sessionToken
        },
        body: this.dom.serialize()
    };
    return options;
}

/**
 * Executes the SOAP call
 * @param {string} url the Campaign endpoint, such as "http://ffdamkt:8080/nl/jsp/soaprouter.jsp"
 * @param {function} delegate is optional. If set, will cann this function to make the HTTP request instead of the request library
 */
SoapMethodCall.prototype.execute = function(url) {
    const that = this;
    const options = this._createHTTPRequest(url);
    const promise = this.transport(options);
    that.request = options.body;
    return promise.then(function(body) {
        that.response = body;
        // Response is a serialized XML document with the following structure
        //
        // Success:
        //      <SOAP-ENV:Envelope>
        //           <SOAP-ENV:Body>
        //               <{{method}}Response>
        //                  {{ return values (one element per return value) }}
        //               </{{method}}Response>
        //           </SOAP-ENV:Body>
        //      </SOAP-ENV:Envelope>
        //
        // Failure:
        //      <SOAP-ENV:Envelope>
        //           <SOAP-ENV:Body>
        //               <SOAP-ENV:Fault>
        //                   <faultcode/>
        //                   <faultstring/>
        //                   <detail/>
        //               </SOAP-ENV:Fault>
        //           </SOAP-ENV:Body>
        //      </SOAP-ENV:Envelope>        
        const dom = new JSDOM(body, {contentType: "text/xml"});
        that.elemCurrent = dom.window.document.firstChild;
        that.elemCurrent = DomUtil.findElement(that.elemCurrent, "SOAP-ENV:Body");
        if (!that.elemCurrent)
            throw new Error("Malformed SOAP response: missing body element");
        that.elemCurrent = DomUtil.getFirstChildElement(that.elemCurrent);
        if (!that.elemCurrent)
            throw new Error("Malformed SOAP response: body element is empty");
        
        // Error management
        if (that.elemCurrent.nodeName == "SOAP-ENV:Fault") {
            const faultCode = DomUtil.findElement(that.elemCurrent, "faultcode").textContent;
            const faultString = DomUtil.findElement(that.elemCurrent, "faultstring").textContent;
            const detail = DomUtil.findElement(that.elemCurrent, "detail").textContent;
            throw new CampaignException(that, 500, faultCode, faultString, detail);
        }
        // Set current element for subsequent calls to getNext* 
        while (that.elemCurrent) {
            var responseMethodTag = `${that.methodName}Response`;
            var nodeName = that.elemCurrent.nodeName;
            //if (nodeName === responseMethodTag || nodeName.endsWith(`:${responseMethodTag}`)) {
            if (nodeName === responseMethodTag) {
                that.elemCurrent = DomUtil.getFirstChildElement(that.elemCurrent);
                break;
            }
            else
                that.elemCurrent = DomUtil.getNextSiblingElement(that.elemCurrent);
        }
    })
    .catch(function(err) {
        throw makeCampaignException(that, err);
    });
}

/**
 * Creates an XML element with the given tag name. This element is created to be added
 * as a parameter with the writeElement() function
 * @param {string} tagName 
 * @returns {Element} the XML element (empty)
 */
SoapMethodCall.prototype.createElement = function(tagName) {
    return this.doc.createElement(tagName);
}


/**
 * Public exports
 */
exports.SoapMethodCall = SoapMethodCall;
exports.CampaignException = CampaignException;