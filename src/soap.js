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
/*jshint sub:true*/

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
 *     const soapCall = new SoapMethodCall(transport, "xtk:session", "GetOption", sessionToken, securityToken, userAgentString);
 * 
 * Fill in input parameters, using the write* functions according to their type
 * 
 *      soapCall.writeString("param1", "value1");
 *      ...
 * 
 * Executes the SOAP call
 * 
 *      soapCall.finalize("http://ffdamkt:8080/nl/jsp/soaprouter.jsp")
 *      promise = soapCall.execute()
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

const { DomUtil, DomException } = require('./domUtil.js');
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const { CampaignException, makeCampaignException } = require('./campaign.js');
const SOAP_ENCODING_NATIVE = "http://schemas.xmlsoap.org/soap/encoding/";
const SOAP_ENCODING_XML = "http://xml.apache.org/xml-soap/literalxml";
const NS_ENV = "http://schemas.xmlsoap.org/soap/envelope/";
const NS_XSI = "http://www.w3.org/2001/XMLSchema-instance";
const NS_XSD = "http://www.w3.org/2001/XMLSchema";


/**
 * @namespace SOAP
 */


  
/**
 * @namespace SOAP
 */


/**
 * Creates a SOAP method call object which encapsulates a SOAP call and helper methods to constructs
 * the call and decode the result.
 * 
 * @constructor SoapMethodCall
 * @param {} transport The transport layer (axios...)
 * @param {string} urn Campaign method namespace, ex: "xtk:session"
 * @param {string} methodName Method name, ex: "Logon"
 * @param {string} sessionToken Campaign session token
 * @param {string} securityToken  Campaign security token
 * @param {string} userAgentString The user agent string to use for HTTP requests
 * @param {string} pushDownOptions Options to push down to the request (comes from connectionParameters._options)
 * @param {{ name:string, value:string}} extraHttpHeaders key/value pair of HTTP header (will override any other headers)
 * @param {string} bearerToken The bearer token to use for HTTP requests. Only required for ImsBearerToken authentication
 * @memberof SOAP
 */
class SoapMethodCall {
    
    constructor(transport, urn, methodName, sessionToken, securityToken, userAgentString, pushDownOptions, extraHttpHeaders, bearerToken) {
        this.request = undefined;       // The HTTP request (object literal passed to the transport layer)
        this.requestOptions = undefined;
        this.response = undefined;      // The HTTP response object (in case of success)

        // Current URN and method (for error reporting)
        this.urn = urn;
        this.methodName = methodName;
        this.isStatic = false;

        // Soap calls marked as internal are calls performed by the framework internally
        // (such as GetEntityIfMoreRecent calls needed to lookup schemas)
        this.internal = false;
        // Enable soap retry
        this.retry = true;
        this._retryCount = 0;

        this._sessionToken = sessionToken || "";
        this._securityToken = securityToken || "";
        this._bearerToken = bearerToken; // may be undefined if not using bearer token authentication
        this._userAgentString = userAgentString;
        this._pushDownOptions = pushDownOptions || {};
        this._charset = this._pushDownOptions.charset || '';
        this._extraHttpHeaders = extraHttpHeaders || {};

        // THe SOAP call being built
        this._doc = undefined;           // XML document for SOAP call
        this._root = undefined;          // Root of the document
        this._header = undefined;        // SOAP-ENV:Header
        this._data = undefined;          // SOAP-ENV:Body
        this._method = undefined;        // XML element for the method

        this._initMessage(urn, methodName, SOAP_ENCODING_NATIVE);

        // Current DOM element for reading result (getNext* functions) 
        this.elemCurrent = undefined;

        // Transport object to perform HTTP request (request or mock)
        this._transport = transport;
    }

    /**
     * Does this call require a logon?
     * @returns {boolean} indicates if the call requires a Logon first
     */
    requiresLogon() {
        const requiresLogon = !(this.urn === "xtk:session" && 
                               (this.methodName === "Logon" || this.methodName === "BearerTokenLogon") ) ;
        return requiresLogon;
    }

    /**
     * Initialze SOAP message
     * 
     * @private
     * @param {string} urn Campaign method namespace, ex: "xtk:session"
     * @param {string} methodName Method name, ex: "Logon"
     * @param {string} encoding the SOAP encoding style (SOAP-ENV:encodingStyle) 
     */
    _initMessage(urn, method, encoding) {
        this.urn = urn;
        this.methodName = method;
        this.encoding = encoding;
        var urnPath = "urn:" + urn;

        this._doc = DomUtil.parse(`<?xml version='1.0' encoding='UTF-8'?><SOAP-ENV:Envelope xmlns:xsd='${NS_XSD}' xmlns:xsi='${NS_XSI}' xmlns:SOAP-ENV='${NS_ENV}' xmlns:ns='http://xml.apache.org/xml-soap'></SOAP-ENV:Envelope>`);
        this._root = this._doc.documentElement;

        this._header = this._doc.createElement(`SOAP-ENV:Header`);
        this._root.appendChild(this._header);

        this._data = this._doc.createElement(`SOAP-ENV:Body`);
        this._root.appendChild(this._data);

        this._method = this._doc.createElement(`m:${method}`);
        this._method.setAttribute(`xmlns:m`, urnPath);
        this._method.setAttribute(`SOAP-ENV:encodingStyle`, encoding);
        this._data.appendChild(this._method);
    }

    /**
     * Adds a XML parameter to the SOAP call being built
     * 
     * @private
     * @param {string} tag the XML node tag name, i.e. the parameter name. Example: "sessiontoken", "login", etc.
     * @param {string} type the SOAP parameter type, ex: "xsd:string"
     * @param {string} value the parameter value, already serialized as a string. For XML types (DOM Element or Document), pass null as the value and SOAP_ENCODING_XML for encoding
     * @param {string} encoding the parameter encoding (optional) : SOAP_ENCODING_NATIVE or SOAP_ENCODING_XML
     * @returns the XML element to be added to the SOAP call
     */
    _addNode(tag, type, value, encoding) {
        const node = this._doc.createElement(tag);
        node.setAttribute("xsi:type", type);
        if (encoding != this.encoding)
        node.setAttribute("SOAP-ENV:encodingStyle", encoding);
        if (value !== null && value !== undefined)
            node.textContent = value;
        this._method.appendChild(node);
        return node;
    }

    /**
     * Sets a byte-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a byte according to xtk rules
     */
    writeByte(tag, value) {
        value = XtkCaster.asByte(value);
        this._addNode(tag, "xsd:byte", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a boolean-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a boolean according to xtk rules
     */
    writeBoolean(tag, value) {
        value = XtkCaster.asBoolean(value);
        this._addNode(tag, "xsd:boolean", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a short-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a short according to xtk rules
     */
    writeShort(tag, value) {
        value = XtkCaster.asShort(value);
        this._addNode(tag, "xsd:short", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a int32-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a int32 according to xtk rules
     */
    writeLong(tag, value) {
        value = XtkCaster.asLong(value);
        this._addNode(tag, "xsd:int", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a int64-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a int64 according to xtk rules
     */
    writeInt64(tag, value) {
        value = XtkCaster.asInt64(value);
        this._addNode(tag, "xsd:long", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a float-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a float according to xtk rules
     */
    writeFloat(tag, value) {
        value = XtkCaster.asNumber(value);
        this._addNode(tag, "xsd:float", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a double-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a double according to xtk rules
     */
    writeDouble(tag, value) {
        value = XtkCaster.asNumber(value);
        this._addNode(tag, "xsd:double", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a string-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a string according to xtk rules
     */
    writeString(tag, value) {
        value = XtkCaster.asString(value);
        this._addNode(tag, "xsd:string", value, SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a timestamp-type parameter
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a timestamp according to xtk rules
     */
    writeTimestamp(tag, value) {
        value = XtkCaster.asTimestamp(value);
        this._addNode(tag, "xsd:datetime", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a date-type parameter (no hour part)
     * @param {string} tag the parameter name
     * @param {*} value the parameter value, which will be casted to a date according to xtk rules
     */
    writeDate(tag, value) {
        value = XtkCaster.asDate(value);
        this._addNode(tag, "xsd:date", XtkCaster.asString(value), SOAP_ENCODING_NATIVE);
    }

    /**
     * Sets a XML element-type parameter. See createElement method to create such an element
     * @param {string} tag the parameter name
     * @param {Element} value the parameter value (XML element)
     */
    writeElement(tag, element) {
        const node = this._addNode(tag, "ns:Element", null, SOAP_ENCODING_XML);
        if (element !== null && element !== undefined) {
            if (element.nodeType === 9) element = element.documentElement;
            const child = this._doc.importNode(element, true);
            node.appendChild(child);
        }
    }

    /**
     * Sets a XML document-type parameter
     * @param {string} tag the parameter name
     * @param {Document} value the parameter value (XML document)
     */
    writeDocument(tag, document) {
        const node = this._addNode(tag, "", null, SOAP_ENCODING_XML);
        if (document !== null && document !== undefined) {
            const element = document.nodeType === 1 ? document : document.documentElement;
            const child = this._doc.importNode(element, true);
            node.appendChild(child);
        }
    }

    /** 
     * Verifies that a returned value matches an expected type. Will throw a CampaignException if there's no match.
     * This will check that the current element (which is the XML element for current returned value) matches the passed type
     * 
     * @private
     * @param {string} type is the expected type (ex: "xsd:string") which is supposed to match the xsi:type attribute of the current element
     * @throws {CampaignException} if the current return value type does not match the expected type
     */
    _checkTypeMatch(type) {
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
     * When the method is implemented in JavaScript instead of C++, then the entity element will actually be named "this".
     * 
     * @private
     * @returns the Entity DOM Element if there's one, or null if there isn't. The currentElement pointer will be  updated accordingly
     */
    getEntity() {
        if (!this.elemCurrent)
            return null;
        if (this.elemCurrent.getAttribute("xsi:type") != "ns:Element")
            return null;
        if (this.elemCurrent.tagName != "entity" && this.elemCurrent.tagName != "this")
            return null;
        var entity = this.elemCurrent;
        entity = DomUtil.getFirstChildElement(entity);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return entity;
    }

    /**
     * Extracts the next result value as a string
     * 
     * @returns {string} the string result value
     */
    getNextString() {
        this._checkTypeMatch("xsd:string");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return value;
    }

    /**
     * Extracts the next result value as a primary key string
     * 
     * @returns {string} the primary key string result value
     */
    getNextPrimaryKey() {
        this._checkTypeMatch("xsd:primarykey");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return value;
    }

    /**
     * Extracts the next result value as a boolean
     * 
     * @returns {number} the boolean result value
     */
    getNextBoolean() {
        this._checkTypeMatch("xsd:boolean");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asBoolean(value);
    }

    /**
     * Extracts the next result value as a byte
     * 
     * @returns {number} the byte result value
     */
    getNextByte() {
        this._checkTypeMatch("xsd:byte");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asByte(value);
    }

    /**
     * Extracts the next result value as a short
     * 
     * @returns {number} the short result value
     */
    getNextShort() {
        this._checkTypeMatch("xsd:short");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asShort(value);
    }

    /**
     * Extracts the next result value as an int32 (xtk long)
     * 
     * @returns {number} the int32 result value
     */
    getNextLong() {
        this._checkTypeMatch("xsd:int");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asLong(value);
    }

    /**
     * Extracts the next result value as a 64 bit integer
     * Will be returned as a string to ensure no precision is lost
     * 
     * @returns {string} the int64 result value as a string
     */
    getNextInt64() {
        this._checkTypeMatch("xsd:long");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return value;
    }

    /**
     * Extracts the next result value as an float
     * 
     * @returns {number} the float result value
     */
    getNextFloat() {
        this._checkTypeMatch("xsd:float");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asFloat(value);
    }

    /**
     * Extracts the next result value as an double
     * 
     * @returns {number} the double result value
     */
    getNextDouble() {
        this._checkTypeMatch("xsd:double");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asDouble(value);
    }

    /**
     * Extracts the next result value as a timestamp
     * 
     * @returns {Date} the timestamp result value
     */
    getNextDateTime() {
        this._checkTypeMatch("xsd:dateTime");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asTimestamp(value);
    }

    /**
     * Extracts the next result value as a date (no hour part)
     * 
     * @returns {Date} the date result value
     */
    getNextDate() {
        this._checkTypeMatch("xsd:date");
        var value = DomUtil.elementValue(this.elemCurrent);
        this.elemCurrent = DomUtil.getNextSiblingElement(this.elemCurrent);
        return XtkCaster.asDate(value);
    }

    /**
     * Extracts the next result value as an XML document
     * 
     * @returns {Document} the XML document result value
     */
    getNextDocument() {
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
     * 
     * @returns {Element} the XML element result value
     */
    getNextElement() {
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
     * 
     * @returns a boolean set to true if ther are no more response args to read
     */ 
    checkNoMoreArgs() {
        return !this.elemCurrent;
    }

    /**
     * Generates "options" object for HTTP request corresponding to the SOAP call
     * 
     * @param {string} url is the Campaign SOAP endpoint (soaprouter.jsp)
     * @returns {Object} an options object describing the HTTP request, with cookies, headers and body
     */
    _createHTTPRequest(url, requestOptions) {

        const headers = {
            'Content-type': `application/soap+xml${this._charset ? ";charset=" + this._charset : ""}`,
            'SoapAction': `${this.urn}#${this.methodName}`,
        };
        if (this._bearerToken) {
            headers['Authorization'] = `Bearer ${this._bearerToken}`;
        }
        else {
            headers['X-Security-Token'] = this._securityToken;
            headers['X-Session-Token'] = this._sessionToken;
        }

        // Add HTTP headers specific to the SOAP call for better tracing/troubleshooting
        if (this._extraHttpHeaders && this._extraHttpHeaders['ACC-SDK-Version']) {
            // "this.retry" means that the call can be retried, not that it is being retried. The HTTP header howerver, indicates that this
            // is actually a retry of a previously failed call (expired token)
            if (this._retryCount > 0) headers["ACC-SDK-Call-RetryCount"] = `${this._retryCount}`;
            if (this.internal) headers["ACC-SDK-Call-Internal"] = "1";
        }

        const request = {
            url: url,
            method: 'POST',
            headers: headers,
            data: DomUtil.toXMLString(this._doc)
        };
        if (this._sessionToken)
            request.headers.Cookie = '__sessiontoken=' + this._sessionToken;
        if (this._userAgentString)
            request.headers['User-Agent'] = this._userAgentString;

        // Override http headers with custom headers
        for (let h in this._extraHttpHeaders) {
            request.headers[h] = this._extraHttpHeaders[h];
        }

        const extraOptions = Object.assign({}, this._pushDownOptions, requestOptions);
        return [ request, extraOptions ];
    }
    
    /**
     * Finalize a SOAP call just before sending
     * @param {string} url the endpoint (/nl/jsp/soaprouter.jsp)
     * @param {client.Client} sdk client (optional)
     */
    finalize(url, client) {
        if (client) {
            this._sessionToken = client._sessionToken;
            this._securityToken = client._securityToken;
            this._bearerToken = client._bearerToken;
        }

        var cookieHeader = DomUtil.findElement(this._header, "Cookie");
        if (this._sessionToken) {
            if (!cookieHeader) {
                cookieHeader = this._doc.createElement("Cookie");
                this._header.appendChild(cookieHeader);
            }
            cookieHeader.textContent = `__sessiontoken=${this._sessionToken}`;
        } else if (cookieHeader) {
            cookieHeader.remove();
        }

        var securityTokenHeader = DomUtil.findElement(this._header, "X-Security-Token");
        if (!securityTokenHeader) {
            securityTokenHeader = this._doc.createElement("X-Security-Token");
            this._header.appendChild(securityTokenHeader);
        }
        securityTokenHeader.textContent = this._securityToken;

        // Always write a sessiontoken element as the first parameter. Even when using SecurityToken authentication
        // and when the session token is actually passed implicitely as a cookie, one must write a sessiontoken
        // element. If not, authentication will fail because the first parameter is interpreted as the "authentication mode"
        // and eventually passed as the first parameter of CXtkLocalSessionPart::GetXtkSecurity
        var sessionTokenElem = DomUtil.findElement(this._method, "sessiontoken");
        if (sessionTokenElem) {
            sessionTokenElem.textContent = this._sessionToken;
        } else {
            sessionTokenElem = this._doc.createElement("sessiontoken");
            sessionTokenElem.setAttribute("xsi:type", "xsd:string");
            // sessionTokenElem.setAttribute("SOAP-ENV:encodingStyle", SOAP_ENCODING_NATIVE);
            sessionTokenElem.textContent = this._sessionToken;
            this._method.prepend(sessionTokenElem);
        }
        const noMethodInURL = !!this._pushDownOptions.noMethodInURL;
        const actualUrl = noMethodInURL ? url : `${url}?soapAction=${encodeURIComponent(this.urn + "#" + this.methodName)}`;

        // Prepare request and empty response objects
        [this.request, this.requestOptions] = this._createHTTPRequest(actualUrl);
        this.response = undefined;
    }

    /**
     * Executes the SOAP call. This function does not return anything but preprocess the result
     * and populates the SoapMethodCall objet so that result values can be read using 
     * the getNext* methods
     * 
     * @param {string} url the Campaign endpoint, such as "http://ffdamkt:8080/nl/jsp/soaprouter.jsp"
     */
    async execute() {
        const that = this;
        const promise = this._transport(this.request, this.requestOptions);
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
            const dom = DomUtil.parse(body);
            that.elemCurrent = dom.documentElement;
            that.elemCurrent = DomUtil.findElement(that.elemCurrent, "SOAP-ENV:Body");
            if (!that.elemCurrent)
                throw new DomException("Malformed SOAP response: missing body element");
            that.elemCurrent = DomUtil.getFirstChildElement(that.elemCurrent);
            if (!that.elemCurrent)
                throw new DomException("Malformed SOAP response: body element is empty");
            
            // Error management
            if (that.elemCurrent.nodeName == "SOAP-ENV:Fault") {
                const faultCode = DomUtil.findElement(that.elemCurrent, "faultcode").textContent;
                const faultString = DomUtil.findElement(that.elemCurrent, "faultstring").textContent;
                const detailNode = DomUtil.findElement(that.elemCurrent, "detail");
                const detail = detailNode ? detailNode.textContent : undefined;
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
            if (that.response && that.response.indexOf(`XSV-350008`) != -1)
              throw CampaignException.SESSION_EXPIRED();
            else throw makeCampaignException(that, err);
        });
    }

    /**
     * Creates an XML element with the given tag name. This element is created to be added
     * as a parameter with the writeElement() function
     * 
     * @private
     * @param {string} tagName 
     * @returns {Element} the XML element (empty)
     */
    createElement(tagName) {
        return this._doc.createElement(tagName);
    }

}

// Public exports
exports.SoapMethodCall = SoapMethodCall;

})();