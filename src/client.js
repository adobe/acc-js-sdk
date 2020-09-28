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
 * ACC JavaScript SDK
 * See README.md for usage
 * 
 *********************************************************************************/

/**
 * Client to ACC instance
 */
const SoapMethodCall = require('./soap.js').SoapMethodCall;
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const XtkEntityCache = require('./xtkEntityCache.js').XtkEntityCache;
const Cipher = require('./crypto.js').Cipher;
const DomUtil = require('./dom.js').DomUtil;
const MethodCache = require('./methodCache.js').MethodCache;
const OptionCache = require('./optionCache.js').OptionCache;
const request = require('request-promise-native');



/**
 * Java Script Proxy handler for XtkObject. An XTK object is one constructed with the following syntax:
 *      NLWS.xtkQueryDef.create(...)
 * Any Xtk methods can be called directly on such an object using this proxy handler which will lookup
 * the method definition and manage parameters marshalling and SOAP call
 */
const xtkObjectHandler = {
    get: function(callContext, methodName) {
        if (methodName == ".") return callContext;

        const caller = function(thisArg, argumentsList) {
            const callContext = thisArg["."];
            methodName = methodName.substr(0, 1).toUpperCase() + methodName.substr(1);
            return callContext.client.callMethod(callContext.schemaId, methodName, callContext.object, argumentsList);
        };

        return new Proxy(caller, {
            apply: function(target, thisArg, argumentsList) {
                return target(thisArg, argumentsList);
            }                
        });

    }
}

/**
 * Java Script Proxy handler for NLWS. 
 * The proxy resolves constructs such as
 *     result = await client.NLWS.xtkSession.getServerTime();
 */
const clientHandler = {
    get: function(client, namespace) {
        return new Proxy({ client:client, namespace:namespace}, {
            get: function(callContext, methodName) {
                if (methodName == ".") return callContext;

                // get Schema id from namespace (find first upper case letter)
                var schemaId = "";
                for (var i=0; i<namespace.length; i++) {
                    const c = namespace[i];
                    if (c >='A' && c<='Z') {
                        schemaId = schemaId + ":" + c.toLowerCase() + namespace.substr(i+1);
                        break;
                    }
                    schemaId = schemaId + c;
                }
                callContext.schemaId = schemaId;

                const caller = function(thisArg, argumentsList) {
                    const callContext = thisArg["."];
                    const namespace = callContext.namespace;
                    const methodNameLC = methodName.toLowerCase();
                    methodName = methodName.substr(0, 1).toUpperCase() + methodName.substr(1);
                    if (namespace == "xtkSession" && methodNameLC == "logon")
                        return callContext.client.logon();
                    else if (namespace == "xtkSession" && methodNameLC == "logoff")
                        return callContext.client.logoff();
                    else if (namespace == "xtkSession" && methodNameLC == "getoption") {
                        var promise = callContext.client.callMethod(schemaId, methodName, undefined, argumentsList);
                        return promise.then(function(optionAndValue) {
                            var value = null;
                            if (optionAndValue && optionAndValue[1] != 0)
                                value = XtkCaster.as(optionAndValue[0], optionAndValue[1]);
                            const optionName = argumentsList[0];
                            client.optionCache.cache(optionName, value);    
                            return optionAndValue;
                        });
                    }
                    // static method
                    var result = callContext.client.callMethod(schemaId, methodName, undefined, argumentsList);
                    return result;
                };

                if (methodName == "create") {
                    return function(body) {
                        callContext.object = body;
                        return new Proxy(callContext, xtkObjectHandler);
                    }
                }

                return new Proxy(caller, {
                    apply: function(target, thisArg, argumentsList) {
                        return target(thisArg, argumentsList);
                    }                
                });
            }
        });
    }
};

/**
 * Wraps the transport for SOAP calls. The transport is a function taking a request (options)
 * and returning a promise. When resolved, the promise returns the request result
 */
function transportWrapper(transport) {
    const browser = !!this.browser;
    const traceSOAPCalls = !!this.traceSOAPCalls;
    return (options) => {
        if (traceSOAPCalls) {
            if (browser) {
                try {
                    var requestBody = DomUtil.parse(options.body);
                    console.log("SOAP//request", options.headers["SoapAction"], requestBody);
                } catch(ex) {
                }
            }
            else 
                console.log("SOAP//request", options.headers["SoapAction"], options.body);
        }
                
        var promise = transport(options).then((body) => {
            
            if (traceSOAPCalls) {
                if (browser) {
                    try {
                        var responseBody = DomUtil.parse(body);
                        console.log("SOAP//response", options.headers["SoapAction"], responseBody);
                    } catch(ex) {
                    }
                }
                else
                    console.log("SOAP//response", options.headers["SoapAction"], body);
            }

            return body;
        });
        return promise;
    }
}

/**
 * ACC API Client
 * 
 * @param {String} endpoint endpoint to connect to, for instance: https://myinstance.campaign.adobe.com
 * @param {String} user user name, for instance admin
 * @param {String} password the user password
 * @param {boolean} rememberMe 
 */
function Client(endpoint, user, password, rememberMe) {
    this.endpoint = endpoint;
    this.user = user;
    this.password = password;       // ## TODO security concern (password kept in memory)
    this.rememberMe = rememberMe;

    this.sessionInfo = undefined;
    this.sessionToken = undefined;
    this.securityToken = undefined;
    this.installedPackages = {};     // package set (key and value = package id, ex: "nms:amp")
    
    this.secretKeyCipher = undefined;
    
    this.entityCache = new XtkEntityCache();
    this.methodCache = new MethodCache();
    this.optionCache = new OptionCache();
    this.representation = "json";                   // "xml" or "json"
    this.NLWS = new Proxy(this, clientHandler);

    this.soapTransport = request;
    this.traceSOAPCalls = false;
    this.browser = typeof window !== 'undefined';

    // expose utilities
    this.DomUtil = DomUtil;
    this.XtkCaster = XtkCaster;
}

/**
 * Is the client logged?
 * @returns {boolean} a boolean indicating if the client is logged or not
 */
Client.prototype.isLogged = function() {
    return this.sessionToken !== null && 
           this.sessionToken !== undefined && 
           this.sessionToken !== "" &&
           this.securityToken !== null && 
           this.securityToken !== undefined && 
           this.securityToken !== "";
}

/**
 * Prepares a SOAP call, including authentication, headers...
 * @param urn is the API name space, usually the schema. For instance xtk:session
 * @param method is the method to call, for instance Logon
 * @return a SoapMethodCall which have been initialized with security tokens... and to which the method
 * parameters should be set
 */
Client.prototype.prepareSoapCall = function(urn, method) {
    const soapCall = new SoapMethodCall(urn, method, this.sessionToken, this.securityToken);
    soapCall.transport = transportWrapper.call(this, this.soapTransport);
    return soapCall;
}

/**
 * After a SOAP method call has been prepared with 'prepareSoapCall', and parameters have been added,
 * this function actually executes the SOAP call
 * @param soapCall
 * @throws Exception
 */
Client.prototype.makeSoapCall = function(soapCall) {
    const requiresLogon = !(soapCall.urn === "xtk:session" && soapCall.methodName === "Logon");
    if (requiresLogon && !this.isLogged())
        throw new Error(`Cannot execute SOAP call ${soapCall.urn}#${soapCall.methodName}: you are not logged in. Use the Logon function first`);
    var soapEndpoint = this.endpoint + "/nl/jsp/soaprouter.jsp";
    return soapCall.execute(soapEndpoint);
}

/**
 * Login to an instance
 */
Client.prototype.logon = function() {
    const that = this;

    this.sessionToken = "";
    this.securityToken = "";

    // Clear session token cookie to ensure we're not inheriting an expired cookie. See NEO-26589
    if (typeof document != "undefined") {
        document.cookie = '__sessiontoken=;path=/;'
    }

    const soapCall = this.prepareSoapCall("xtk:session", "Logon");
    soapCall.writeString("login", that.user);
    soapCall.writeString("password", that.password);
    var parameters = null;
    if (!!that.rememberMe) {
        parameters = soapCall.createElement("parameters");
        parameters.setAttribute("rememberMe", "true");
    }
    soapCall.writeElement("parameters", parameters);
    
    return this.makeSoapCall(soapCall).then(function() {
        sessionToken = soapCall.getNextString();
        
        that.sessionInfo = soapCall.getNextDocument();
        that.installedPackages = {};
        const userInfo = DomUtil.findElement(that.sessionInfo, "userInfo");
        if (userInfo) {
          var pack = DomUtil.getFirstChildElement(userInfo, "installed-package");
          while (pack) {
            const name = `${DomUtil.getAttributeAsString(pack, "namespace")}:${DomUtil.getAttributeAsString(pack, "name")}`;
            that.installedPackages[name] = name;
            pack = DomUtil.getNextSiblingElement(pack);
          }
        }
        
        securityToken = soapCall.getNextString();
        soapCall.checkNoMoreArgs();
        // Sanity check: we should have both a session token and a security token.
        if (!sessionToken)
            throw new Error(`Logon method succeeded, but no session token was returned`);
        if (!securityToken)
            throw new Error(`Logon method succeeded, but no security token was returned`);
        // store member variables after all parameters are decode the ensure atomicity
        that.sessionToken = sessionToken;
        that.securityToken = securityToken;
    });
}

/**
 * Logs off from an instance to which one previous logged on using the "logon" call
 */
Client.prototype.logoff = function() {
    var that = this;
    if (!that.isLogged()) return;
    var soapCall = that.prepareSoapCall("xtk:session", "Logoff");
        return this.makeSoapCall(soapCall).then(function() {
        that.endpoint = "";
        that.sessionToken = "";
        that.securityToken = "";
        soapCall.checkNoMoreArgs();
    });
}

/**
 * Get the value of an option
 * @param name is the option name, for instance XtkDatabaseId
 * @param useCache
 * @return the option value, casted in the expected data type. If the option does not exist, it will return null.
 */
Client.prototype.getOption = async function(name, useCache = true) {
    var value = undefined;
    if (useCache)
        value = this.optionCache.get(name);
    if (value === undefined) {
        var option = await this.NLWS.xtkSession.getOption(name);
        if (!option || option[1] == 0)
            value = null;
        else
            value = XtkCaster.as(option[0], option[1]);
        this.optionCache.cache(name, value);
    }
    return value;
}

/**
 * Clears the options cache
 */
Client.prototype.clearOptionCache = function() {
    this.optionCache.clear();
}

/**
 * Clears the method cache
 */
Client.prototype.clearMethodCache = function() {
    this.methodCache.clear();
}

/**
 * Clears the entity cache
 */
Client.prototype.clearEntityCache = function() {
    this.entityCache.clear();
}

/**
 * Clears all caches
 */
Client.prototype.clearAllCaches = function() {
    this.clearEntityCache();
    this.clearMethodCache();
    this.clearOptionCache();
}

/**
 * Check if a package is installed
 * @param {String} packageId the package identifier, for instance: "nms:amp"
 * @param {String} optionalName if set, the first parameter will be interpreted as the namespace (ex: "nms") and the second as the name, ex: "amp"
 */
Client.prototype.hasPackage = function(packageId, optionalName) {
  if (optionalName === undefined)
    packageId = `${packageId}:${optionalName}`;
  if (!this.isLogged())
    throw new Error(`Cannot call hasPackage: session not connected`);
  return this.installedPackages[packageId] !== undefined;
}

/**
 * Obtains a cipher that can be used to encrypt/decrypt passwords, using the database secret key.
 * This is used for example for mid-sourcing account. 
 */
Client.prototype.getSecretKeyCipher = async function() {
    var that = this;
    if (this.secretKeyCipher) return this.secretKeyCipher;
    return that.getOption("XtkSecretKey").then(function(secretKey) {
        that.secretKeyCipher = new Cipher(secretKey);
        return that.secretKeyCipher;
    });
}

/**
 * Get the client for a mid-sourcing
 * @param {String} name is the mid external account name. If empty, will use the default "defaultMid" account
 * @return {Client} a Campaign client interface to the mid server (you still need to call logon on it)
 */
Client.prototype.getMidClient = async function(name) {
    var that = this;
    name = name || "defaultEmailMid";

    var queryDef = {
        "@schema": "nms:extAccount",
        "@operation": "get",
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@name" },
                { "@expr": "@label" },
                { "@expr": "@type" },
                { "@expr": "@account" },
                { "@expr": "@password" },
                { "@expr": "@server" }
            ]
        },
        "where": {
            "condition": [
                { "@expr": "@name='" + name + "'" },
                { "@expr": "@type=3" }
            ]
        }
    }
    const query = that.NLWS.xtkQueryDef.create(queryDef);
    const extAccount = await query.executeQuery();
    const cipher = await that.getSecretKeyCipher();
    const endpoint = XtkCaster.asString(extAccount["@server"]);
    const user = XtkCaster.asString(extAccount["@account"]);
    const password = cipher.decryptPassword(XtkCaster.asString(extAccount["@password"]));
    const midClient = new Client(endpoint, user, password);
    return midClient;
}

/**
 * Get entity
 * @param entityType is the type of entity requested, such as "xtk:schema", "xtk:srcSchema", "xtk:navtree", "xtk:form", etc.
 * @param fullName is the fully qualified name of the entity (i.e. <namespace>:<name>)
 * @return A DOM representation of the entity, or null if the entity is not found
 */
Client.prototype.getEntityIfMoreRecent = function(entityType, fullName) {
    const soapCall = this.prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent");
    soapCall.writeString("pk", entityType + "|" + fullName);
    soapCall.writeString("md5", "");
    soapCall.writeBoolean("mustExist", false);
    return this.makeSoapCall(soapCall).then(function() {
        const doc = soapCall.getNextDocument();
        soapCall.checkNoMoreArgs();
       return doc;
    });
}

/**
 * Get a schema definition.
 * @param {string} shcemaId the schema id, such as "xtk:session", or "nms:recipient"
 * @param {string} representation an optional representation of the schema: "json" or "xml". If not set, we'll use the client default representation
 * @returns {*} the schema definition, as either a DOM document or a JSON object
 */
Client.prototype.getSchema = async function(shcemaId, representation) {
    var that = this;
    var entity = that.entityCache.get("xtk:schema", shcemaId);
    if (!entity) {
        entity = await that.getEntityIfMoreRecent("xtk:schema", shcemaId);
    }
    if (entity)
        that.entityCache.put("xtk:schema", shcemaId, entity);

    representation = representation || that.representation;
    if (representation == "json")
        entity = DomUtil.toJSON(entity);
    else if (representation != "xml")
        throw new Error(`Unsupported representation '${representation}'`);
    return entity;
}
/**
 * Get the definition of a sys enum. Will be returned as JSON or XML depending on the client 'representation' attribute
 */
Client.prototype.getSysEnum = async function(enumName, optionalStartSchemaOrSchemaName) {

    // Called with one parameter: enumName must be the fully qualified enumeration name
    // as <namespace>:<schema>:<enum>, for instance "nms:extAccount:encryptionType"
    if (!optionalStartSchemaOrSchemaName) {
        var index = enumName.lastIndexOf(':');
        if (index == -1)
            throw new Error(`getEnum expects a fully qualified enumeration name. '${enumName}' is not a valid name.`);
        optionalStartSchemaOrSchemaName = enumName.substring(0, index);
        enumName = enumName.substring(index + 1);
    }

    // If we have a schema name (and not a schema), then lookup the schema by name
    if (optionalStartSchemaOrSchemaName && ((typeof optionalStartSchemaOrSchemaName) == "string")) {
        var index = optionalStartSchemaOrSchemaName.lastIndexOf(':');
        if (index == -1)
            throw new Error(`getEnum expects a valid schema name. '${optionalStartSchemaOrSchemaName}' is not a valid name.`);
        optionalStartSchemaOrSchemaName = await this.getSchema(optionalStartSchemaOrSchemaName);
    }
    if (!optionalStartSchemaOrSchemaName) {
        throw new Error(`Failed to find schema to load enumeration '${enumName}'`);
    }
    var schema = optionalStartSchemaOrSchemaName; 

    if (this.representation == "json") {
        if (schema.enumeration) {
            for (var i in schema.enumeration) {
                var e = schema.enumeration[i];
                if (e["@name"] == enumName)
                    return e;
            }
        }
    }
    else if (this.representation == "xml") {
        var enumNode = DomUtil.getFirstChildElement(schema, "enumeration");
        while (enumNode) {
            var name = DomUtil.getAttributeAsString(enumNode, "name");
            if (name == enumName) 
                break;
            enumNode = DomUtil.getNextSiblingElement(enumNode, "enumeration")
        }
        return enumNode;
    }
    else
        throw new Error(`Unsupported representation '${this.representation}'`);
}

/**
 * Call Campaign SOAP method
 * 
 * @param {string} schemaId is the schema id, such as "xtk:session", "xtk:persist", "nms:recipient"...
 * @param {string} methodName is the method to call. In order to be more JavaScript friendly, the first char can be lower-cased
 * @param {JSON|XML} object is the Xtk object for non static method. Create one with for example: NLWS.xtkQueryDef.create(...)
 * @param {*} parameters is an array of function parameters. When there's only one parameter, it can be passed directly
 * @returns {*} the SOAP call result. If there's just one output parameter, the value itself will be returned. If not, an array will be returned
 */
Client.prototype.callMethod = async function(schemaId, methodName, object, parameters) {
    const that = this;
    const result = [];
    
    var schema = await that.getSchema(schemaId, "xml");
    if (!schema)
        throw new Error(`Schema '${schemaId}' not found`);
    var schemaName = schema.getAttribute("name");
    var method = that.methodCache.get(schemaId, methodName);
    if (!method) {
        this.methodCache.cache(schema);
        method = that.methodCache.get(schemaId, methodName);
    }
    if (!method)
        throw new Error(`Method '${methodName}' of schema '${schemaId}' not found`);
    // console.log(method.toXMLString());

    var soapCall = that.prepareSoapCall(schemaId, methodName);

    const isStatic = DomUtil.getAttributeAsBoolean(method, "static");
    if (!isStatic) {
        if (!object)
            throw new Error(`Cannot call non-static method '${methodName}' of schema '${schemaId}' : no object was specified`);
        if (this.representation == "json") {
            const rootName = schemaId.substr(schemaId.indexOf(':') + 1);
            object = DomUtil.fromJSON(rootName, object);
            soapCall.writeDocument("document", object);
        }
        else if (this.representation == "xml")
            soapCall.writeDocument("document", object);
        else
            throw new Error(`Unsupported representation '${this.representation}'`);
    }

    const parametersIsArray = (typeof parameters == "object") && parameters.length;
    const params = DomUtil.getFirstChildElement(method, "parameters");
    if (params) {
        var param = DomUtil.getFirstChildElement(params, "param");
        var paramIndex = 0;
        while (param) {
            const inout = DomUtil.getAttributeAsString(param, "inout");
            if (!inout || inout=="in") {
                const type = DomUtil.getAttributeAsString(param, "type");
                const paramName = DomUtil.getAttributeAsString(param, "name");
                const paramValue = parametersIsArray ? parameters[paramIndex] : parameters;
                paramIndex = paramIndex + 1;
                if (type == "string")
                    soapCall.writeString(paramName, XtkCaster.asString(paramValue));
                else if (type == "boolean")
                    soapCall.writeBoolean(paramName, XtkCaster.asBoolean(paramValue));
                else if (type == "byte")
                    soapCall.writeByte(paramName, XtkCaster.asByte(paramValue));
                else if (type == "short")
                    soapCall.writeShort(paramName, XtkCaster.asShort(paramValue));
                else if (type == "long")
                    soapCall.writeLong(paramName, XtkCaster.asLong(paramValue));
                else if (type == "datetime")
                    soapCall.writeTimestamp(paramName, XtkCaster.asTimestamp(paramValue));
                else if (type == "date")
                    soapCall.writeDate(paramName, XtkCaster.asDate(paramValue));
                else if (type == "DOMDocument" || type == "DOMElement") {
                    var xmlValue = paramValue;
                    var docName = undefined;
                    // Hack for workflow API. The C++ code checks that the name of the XML element is <variables>. When
                    // using xml representation at the SDK level, it's ok since the SDK caller will set that. But this does
                    // not work when using "json" representation where we do not know the root element name.
                    if (schemaId == "xtk:workflow" && methodName == "StartWithParameters" && paramName == "parameters")
                        docName = "variables";
                    if (that.representation == "json") {
                        // Try to guess the document name. This is usually available in the xtkschema attribute
                        const xtkschema = paramValue["@xtkschema"];
                        if (xtkschema) {
                            const index = xtkschema.indexOf(":");
                            docName = xtkschema.substr(index+1);
                        }
                        if (!docName)
                            throw new Error(`Cannot transform '${type}' parameter '${paramName}' to JSON: @xtkschema attribute not set`);
                        xmlValue = DomUtil.fromJSON(docName, paramValue);
                    }
                    else if (that.representation !== "xml")
                        throw new Error(`Unsupported representation '${that.representation}'`);
                    if (type == "DOMDocument")
                        soapCall.writeDocument(paramName, xmlValue);
                    else
                        soapCall.writeElement(paramName, xmlValue.documentElement);
                }
                else
                    throw new Error(`Unsupported parameter type '${type}' for parameter '${paramName}' of method '${methodName}' of schema '${schemaId}`);
            }
            param = DomUtil.getNextSiblingElement(param, "param");
        }
    }
    
    return that.makeSoapCall(soapCall).then(function() {
        var paramIndex = 0;
        if (params) {
            var param = DomUtil.getFirstChildElement(params, "param");
            while (param) {
                const inout = DomUtil.getAttributeAsString(param, "inout");
                if (inout=="out") {
                    const type = DomUtil.getAttributeAsString(param, "type");
                    const paramName = DomUtil.getAttributeAsString(param, "name");
                    var returnValue;
                    if (type == "string")
                        returnValue = soapCall.getNextString();
                    else if (type == "boolean")
                        returnValue = soapCall.getNextBoolean();
                    else if (type == "byte")
                        returnValue = soapCall.getNextByte();
                    else if (type == "short")
                        returnValue = soapCall.getNextShort();
                    else if (type == "long")
                        returnValue = soapCall.getNextLong();
                    else if (type == "datetime")
                        returnValue = soapCall.getNextDateTime();
                    else if (type == "date")
                        returnValue = soapCall.getNextDate();
                    else if (type == "DOMDocument") {
                        returnValue = soapCall.getNextDocument();
                        if (that.representation == "json") {
                            returnValue = DomUtil.toJSON(returnValue);
                            if (schemaId === "xtk:queryDef" && methodName === "ExecuteQuery" && paramName === "output") {
                                // https://github.com/adobe/acc-js-sdk/issues/3
                                // Check if query operation is "getIfExists". The "object" variable at this point
                                // is always an XML, regardless of the xml/json representation
                                const objectRoot = object.documentElement;
                                const emptyResult = Object.keys(returnValue).length == 0;
                                var operation = DomUtil.getAttributeAsString(objectRoot, "operation");
                                if (operation == "getIfExists" && emptyResult)
                                    returnValue = null;
                                if (operation == "select" && emptyResult) {
                                    const querySchemaId = DomUtil.getAttributeAsString(objectRoot, "schema");
                                    const index = querySchemaId.indexOf(':');
                                    const querySchemaName = querySchemaId.substr(index + 1);
                                    returnValue[querySchemaName] = [];
                                }
                            }
                        }
                        else if (that.representation != "xml")
                            throw new Error(`Unsupported representation '${that.representation}'`);
                    }
                    else if (type == "DOMElement") {
                        returnValue = soapCall.getNextElement();
                        if (that.representation == "json")
                            returnValue = DomUtil.toJSON(returnValue);
                        else if (that.representation != "xml")
                            throw new Error(`Unsupported representation '${that.representation}'`);
                    }
                    else {
                        // type can reference a schema element. The naming convension is that the type name
                        // is {schemaName}{elementNameCamelCase}. For instance, the type "sessionUserInfo"
                        // matches the "userInfo" element of the "xtkSession" schema
                        if (type.substr(0, schemaName.length) == schemaName) {
                            const shortTypeName = type.substr(schemaName.length, 1).toLowerCase() + type.substr(schemaName.length + 1);
                            var element = DomUtil.getFirstChildElement(schema, "element");
                            while (element) {
                                if (element.getAttribute("name") == shortTypeName) {
                                    // Type found in schema: Process as a DOM element
                                    returnValue = soapCall.getNextElement();
                                    if (that.representation == "json")
                                        returnValue = DomUtil.toJSON(returnValue);
                                    break;
                                }
                                element = DomUtil.getNextSiblingElement(element, "element")
                            }

                        }
/*                    else if (type == "sessionUserInfo") {
                        returnValue = soapCall.getNextElement();
                        if (that.representation == "json")
                            returnValue = DomUtil.toJSON(returnValue);
                    }
                    */
                        if (!element)
                            throw new Error(`Unsupported return type '${type}' for parameter '${paramName}' of method '${methodName}' of schema '${schemaId}'`);
                    }
                    result.push(returnValue);
                }
                param = DomUtil.getNextSiblingElement(param, "param");
            }
        }
        soapCall.checkNoMoreArgs();
        if (result.length == 0) return null;
        if (result.length == 1) return result[0];
        return result;
    });
}


/**
 * Public exports
 */
exports.Client = Client;


