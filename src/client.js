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
const { SoapMethodCall, CampaignException } = require('./soap.js');
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const XtkEntityCache = require('./xtkEntityCache.js').XtkEntityCache;
const Cipher = require('./crypto.js').Cipher;
const DomUtil = require('./dom.js').DomUtil;
const MethodCache = require('./methodCache.js').MethodCache;
const OptionCache = require('./optionCache.js').OptionCache;
const request = require('request-promise-native');
const Application = require('./application.js').Application;
const EntityAccessor = require('./entityAccessor.js').EntityAccessor;


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
            if (methodName == "inspect") return callContext.object;
            methodName = methodName.substr(0, 1).toUpperCase() + methodName.substr(1);
            return callContext.client._callMethod(methodName, callContext, argumentsList);
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
                        return callContext.client.logon(argumentsList[0]);
                    else if (namespace == "xtkSession" && methodNameLC == "logoff")
                        return callContext.client.logoff();
                    else if (namespace == "xtkSession" && methodNameLC == "getoption") {
                        var promise = callContext.client._callMethod(methodName, callContext, argumentsList);
                        return promise.then(function(optionAndValue) {
                            const optionName = argumentsList[0];
                            client._optionCache.cache(optionName, optionAndValue);
                            return optionAndValue;
                        });
                    }
                    // static method
                    var result = callContext.client._callMethod(methodName, callContext, argumentsList);
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
    const browser = !!this._browser;
    const traceSOAPCalls = !!this._traceSOAPCalls;
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
    

        var promise = transport(options);

        // If you fail here during a test, with "promise" being null or undefined, it means that the test execture SOAP calls which
        // were not mocked => the promise to resolve is null. When this happens, run the test again with soap calls activated to
        // display which SOAP calls are executed and their response. See Client.traceSOAPCalls(true);

        promise.then((body) => {
            
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


// ========================================================================================
// Campaign credentials
// ========================================================================================

/**
 * Credentials to a Campaign instance. Encapsulats the various types of credentials
 * @param {string} type the credentials type. Supported types are "UserPassword" and "ImsServiceToken" and "SessionToken" and "AnonymousUser"
 * @param {string} sessionToken the session token. It's exact form depends on the credentials type. For instance it can be "user/passord" for the "UserPassword" credentials type
 * @param {string} securityToken the security token. Will use an empty token if not specified
 */
function Credentials(type, sessionToken, securityToken) {
    if (type != "UserPassword" && type != "ImsServiceToken" && type != "SessionToken" && type != "AnonymousUser")
        throw new Error(`Invalid credentials type '${type}`);
    this._type = type;
    this._sessionToken = sessionToken || "";
    this._securityToken = securityToken || "";
}

/**
 * For "UserPassword" type credentials, return the user name
 * @returns {string} the user name
 */
Credentials.prototype._getUser = function() {
    if (this._type != "UserPassword")
        throw new Error(`Cannot get user for Credentials of type '${this._type}'`);
    const [ user, _ ] = this._sessionToken.split("/");
    return user;
}

/**
 * For "UserPassword" type credentials, return the user password
 * @returns {string} the user password
 */
 Credentials.prototype._getPassword = function() {
    if (this._type != "UserPassword")
        throw new Error(`Cannot get password for Credentials of type '${this._type}'`);
    const [ _, password ] = this._sessionToken.split("/");
    return password;
}


// ========================================================================================
// Campaign connection parameters
// ========================================================================================

/**
 * Creates a connection parameters object which can be used to create a Client object
 * to connect to a Campaign instance
 * @param {string} endpoint The campaign endpoint (URL)
 * @param {Credentials} credentials The credentials for the connection
 * @param {*} options connection options. Currently only contains a "representation" attribute which controls what type of entities (xml or json) the SDK handles
 */
function ConnectionParameters(endpoint, credentials, options) {
    // Default value
    if (options === undefined || options === null)
        options = { };
    if (options.representation === undefined || options.representation === null)
        options.representation = "SimpleJson";

    // Before version 1.0.0, the 4th parameter could be a boolean for the 'rememberMe' option.
    // Passing a boolean is not supported any more in 1.0.0. The Client constructor takes an
    // option object. The rememberMe parameter can be passed directly to the logon function
    if (typeof options  != "object")
        throw new Error(`Invalid options parameter (type '${typeof options}'). An object litteral is expected`);

    if (options.representation != "xml" && options.representation != "BadgerFish" && options.representation != "SimpleJson")
        throw new Error(`Invalid representation '${options.representation}'. Cannot create client object`);

    // Defaults for rememberMe
    options.rememberMe = !!options.rememberMe;

    this._endpoint = endpoint;
    this._credentials = credentials;
    this._options = options;
}

/**
 * Creates connection parameters for a Campaign instance, using a user name and password
 * @param {string} endpoint The campaign endpoint (URL)
 * @param {string} user The user name
 * @param {string} password The user password
 * @param {*} options connection options
 * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
 */
ConnectionParameters.ofUserAndPassword = function(endpoint, user, password, options) {
    const credentials = new Credentials("UserPassword", `${user}/${password}`, "");
    return new ConnectionParameters(endpoint, credentials, options);
}

/**
 * Creates connection parameters for a Campaign instance, using an IMS service token and a user name (the user to impersonate)
 * @param {string} endpoint The campaign endpoint (URL)
 * @param {string} user The user name
 * @param {string} serviceToken The IMS service token
 * @param {*} options connection options
 * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
 */
ConnectionParameters.ofUserAndServiceToken = function(endpoint, user, serviceToken, options) {
    const credentials = new Credentials("ImsServiceToken", `_ims_/${user}/${serviceToken}`, "");
    return new ConnectionParameters(endpoint, credentials, options);
}

/**
 * Creates connection parameters for a Campaign instance, using a session token
 * @param {string} endpoint The campaign endpoint (URL)
 * @param {string} sessionToken The session token
 * @param {*} options connection options
 * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
 */
 ConnectionParameters.ofSessionToken = function(endpoint, sessionToken, options) {
    const credentials = new Credentials("SessionToken", sessionToken, "");
    return new ConnectionParameters(endpoint, credentials, options);
}

/**
 * Creates connection parameters for a Campaign instance for an anonymous user
 * @param {string} endpoint The campaign endpoint (URL)
 * @param {*} options connection options
 * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
 */
 ConnectionParameters.ofAnonymousUser = function(endpoint, options) {
    const credentials = new Credentials("AnonymousUser", "", "");
    return new ConnectionParameters(endpoint, credentials, options);
}


/**
 * Creates connection parameters for a Campaign instance, using an external account. This can be used to connect
 * to a mid-sourcing instance, or to a message center instance. This function will lookup the external account,
 * and use its credentials to get connection parameters to the corresponding Campaign instance
 * @param {Client} client The Campaign Client from which to lookup the external account (normally, a connected client to the marketing instance)
 * @param {string} extAccountName The name of the external account. Only mid-sourcing accounts (type 3) are supported
 * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
 */
ConnectionParameters.ofExternalAccount = async function(client, extAccountName) {
    var queryDef = {
        "schema": "nms:extAccount",
        "operation": "get",
        "select": {
            "node": [
                { "expr": "@id" },
                { "expr": "@name" },
                { "expr": "@label" },
                { "expr": "@type" },
                { "expr": "@account" },
                { "expr": "@password" },
                { "expr": "@server" }
            ]
        },
        "where": {
            "condition": [
                { "expr": client.sdk.escapeXtk`@name=${extAccountName}` },
                { "expr": "@type=3" }
            ]
        }
    }
    // Convert to current representation
    queryDef = client.convertToRepresentation(queryDef, "SimpleJson");
    const query = client.NLWS.xtkQueryDef.create(queryDef);
    const extAccount = await query.executeQuery();

    const cipher = await client._getSecretKeyCipher();
    const type = EntityAccessor.getAttributeAsLong(extAccount, "type");
    if (type == 3) {
        // Mid-souring
        const endpoint = EntityAccessor.getAttributeAsString(extAccount, "server");
        const user = EntityAccessor.getAttributeAsString(extAccount, "account");
        const password = cipher.decryptPassword(EntityAccessor.getAttributeAsString(extAccount, "password"));
        return ConnectionParameters.ofUserAndPassword(endpoint, user, password, client._connectionParameters._options);
    }
    throw new Error(`Cannot created connection parameters for external account '${extAccountName}': account type ${type} not supported`);
}


// ========================================================================================
// ACC Client
// ========================================================================================

/**
 * ACC API Client
 * 
 * @param {SDK} sdk is the global sdk object used to create the client
 * @param {ConnectionParameters} user user name, for instance admin
 */
function Client(sdk, connectionParameters) {
    this.sdk = sdk;
    this._connectionParameters = connectionParameters; // ## TODO security concern (password kept in memory)
    this._representation = connectionParameters._options.representation;

    this._sessionInfo = undefined;
    this._sessionToken = undefined;
    this._securityToken = undefined;
    this._installedPackages = {};     // package set (key and value = package id, ex: "nms:amp")
    
    this._secretKeyCipher = undefined;
    
    this._entityCache = new XtkEntityCache();
    this._methodCache = new MethodCache();
    this._optionCache = new OptionCache();
    this.NLWS = new Proxy(this, clientHandler);

    this._soapTransport = request;
    this._traceSOAPCalls = false;
    this._browser = typeof window !== 'undefined';

    // expose utilities
    this.DomUtil = DomUtil;
    this.XtkCaster = XtkCaster;
    this.application = null;
}

Client.CampaignException = CampaignException;

/**
 * Get the user agent string to use in all HTTP requests
 */
Client.prototype.getUserAgentString = function() {
    const version = this.sdk.getSDKVersion();
    return `${version.name}/${version.version} ${version.description}`;
}

/**
 * Convert an XML object into a representation
 * @param {DOMElement} xml the XML DOM element to convert
 * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
 * @returns {DOMElement|JSON} the object converted in the requested representation
 */
Client.prototype.toRepresentation = function(xml, representation) {
    representation = representation || this._representation;
    if (representation == "xml")
        return xml;
    if (representation == "BadgerFish" || representation == "SimpleJson") {
        var json = DomUtil.toJSON(xml, representation);
        if (representation == "BadgerFish" && json)
            json.__representation = "BadgerFish";
        return json;
    }
    throw new Error(`Unsupported representation '${this._representation}'`);
}

/**
 * Convert to an XML object from a representation
 * @param {string} rootName the name of the root XML element
 * @param {DOMElement|JSON} entity the object to convert
 * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
 * @returns {DOMElement} the object converted to XML
 */
 Client.prototype.fromRepresentation = function(rootName, entity, representation) {
    representation = representation || this._representation;
    if (representation == "xml")
        return entity;
    if (representation == "BadgerFish" || representation == "SimpleJson") {
        var xml = DomUtil.fromJSON(rootName, entity, representation);
        return xml;
    }
    throw new Error(`Unsupported representation '${this._representation}'`);
}

/**
 * Convert between 2 representations
 * @param {DOMElement|JSON} entity the object to convert
 * @param {string} fromRepresentation the source representation ('xml', 'BadgerFish', or 'SimpleJson').
 * @param {string} toRepresentation the target representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
 * @returns {DOMElement} the converted object
 */
Client.prototype.convertToRepresentation = function(entity, fromRepresentation, toRepresentation) {
    toRepresentation = toRepresentation || this._representation;
    if (this.isSameRepresentation(fromRepresentation, toRepresentation))
        return entity;
    var xml = this.fromRepresentation("root", entity, fromRepresentation);
    entity = this.toRepresentation(xml, toRepresentation);
    return entity;
}

/**
 * Compare two representations
 * @param {string} rep1 the first representation ('xml', 'BadgerFish', or 'SimpleJson')
 * @param {string} rep2 the second representation ('xml', 'BadgerFish', or 'SimpleJson')
 * @returns a boolean indicating if the 2 representations are the same or not
 */
Client.prototype.isSameRepresentation = function(rep1, rep2) {
    if (!rep1 || !rep2) throw new Error(`Undefined representation: cannot compare`);
    if (rep1 != "xml" && rep1 != "SimpleJson" && rep1 != "BadgerFish") throw new Error(`Invalid representation '${rep1}': cannot compare`);
    if (rep2 != "xml" && rep2 != "SimpleJson" && rep2 != "BadgerFish") throw new Error(`Invalid representation '${rep2}': cannot compare`);
    if (rep1 == rep2) return true;
    return rep1 == rep2;
}

/**
 * Activate / deactivate tracing of SOAP calls
 * @param {boolean} trace indicates whether to activate tracing or not
 */
Client.prototype.traceSOAPCalls = function(trace) {
    this._traceSOAPCalls = trace;
}

/**
 * Is the client logged?
 * @returns {boolean} a boolean indicating if the client is logged or not
 */
Client.prototype.isLogged = function() {
    const credentialsType = this._connectionParameters._credentials._type;
    if (credentialsType == "AnonymousUser")
        return true;

    // with session token authentication, we do not expect a security token
    const isSessionTokenAuth = credentialsType == "SessionToken";

    return this._sessionToken !== null && 
           this._sessionToken !== undefined && 
           this._sessionToken !== "" &&
           (isSessionTokenAuth || (
            this._securityToken !== null && 
            this._securityToken !== undefined && 
            this._securityToken !== ""));
}

/**
 * Prepares a SOAP call, including authentication, headers...
 * @param urn is the API name space, usually the schema. For instance xtk:session
 * @param method is the method to call, for instance Logon
 * @return a SoapMethodCall which have been initialized with security tokens... and to which the method
 * parameters should be set
 */
Client.prototype.prepareSoapCall = function(urn, method) {
    const soapCall = new SoapMethodCall(urn, method, this._sessionToken, this._securityToken);
    soapCall.transport = transportWrapper.call(this, this._soapTransport);
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
    var soapEndpoint = this._connectionParameters._endpoint + "/nl/jsp/soaprouter.jsp";
    return soapCall.execute(soapEndpoint);
}

/**
 * Login to an instance
 */
Client.prototype.logon = function() {
    const that = this;

    this.application = null;
    this._sessionToken = "";
    this._securityToken = "";

    // Clear session token cookie to ensure we're not inheriting an expired cookie. See NEO-26589
    if (typeof document != "undefined") {
        document.cookie = '__sessiontoken=;path=/;'
    }

    const credentials = this._connectionParameters._credentials;
    if (credentials._type == "SessionToken" || credentials._type == "AnonymousUser") {
        that._sessionInfo = undefined;
        that._installedPackages = {};
        that._sessionToken = credentials._sessionToken;
        that._securityToken = "";
        that.application = new Application(that);
    }
    else if (credentials._type == "UserPassword") {
        const user = credentials._getUser();
        const password = credentials._getPassword();

        const soapCall = this.prepareSoapCall("xtk:session", "Logon");
        soapCall.writeString("login", user);
        soapCall.writeString("password", password);
        var parameters = null;
        if (!!this._connectionParameters._options.rememberMe) {
            parameters = soapCall.createElement("parameters");
            parameters.setAttribute("rememberMe", "true");
        }
        soapCall.writeElement("parameters", parameters);
        
        return this.makeSoapCall(soapCall).then(function() {
            sessionToken = soapCall.getNextString();
            
            that._sessionInfo = soapCall.getNextDocument();
            that._installedPackages = {};
            const userInfo = DomUtil.findElement(that._sessionInfo, "userInfo");
            if (!userInfo)
                throw new Error(`Invalid response for xtk:session#Logon API call: userInfo structure missing`);
            var pack = DomUtil.getFirstChildElement(userInfo, "installed-package");
            while (pack) {
                const name = `${DomUtil.getAttributeAsString(pack, "namespace")}:${DomUtil.getAttributeAsString(pack, "name")}`;
                that._installedPackages[name] = name;
                pack = DomUtil.getNextSiblingElement(pack);
            }
            
            securityToken = soapCall.getNextString();
            soapCall.checkNoMoreArgs();
            // Sanity check: we should have both a session token and a security token.
            if (!sessionToken)
                throw new Error(`Logon method succeeded, but no session token was returned`);
            if (!securityToken)
                throw new Error(`Logon method succeeded, but no security token was returned`);
            // store member variables after all parameters are decode the ensure atomicity
            that._sessionToken = sessionToken;
            that._securityToken = securityToken;

            that.application = new Application(that);
        });
    }
    else {
        throw new Error(`Cannot logon: unsupported credentials type '${credentials._type}'`);
    }
}

Client.prototype.getSessionInfo = function(representation) {
    representation = representation || this._representation;
    return this.toRepresentation(this._sessionInfo, representation);
}

/**
 * Logs off from an instance to which one previous logged on using the "logon" call
 */
Client.prototype.logoff = function() {
    var that = this;
    if (!that.isLogged()) return;
    
    const credentials = this._connectionParameters._credentials;
    if (credentials._type != "SessionToken" && credentials._type != "AnonymousUser") {
        var soapCall = that.prepareSoapCall("xtk:session", "Logoff");
            return this.makeSoapCall(soapCall).then(function() {
            that._sessionToken = "";
            that._securityToken = "";
            that.application = null;
            soapCall.checkNoMoreArgs();
        });
    }
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
        value = this._optionCache.get(name);
    if (value === undefined) {
        const option = await this.NLWS.xtkSession.getOption(name);
        value = this._optionCache.cache(name, option);
        this._optionCache.cache(name, option);
    }
    return value;
}

/**
 * Set an option value. Creates the option if it does not exists. Update the option
 * if it exists already
 * @param {string} name the option name
 * @param {*} rawValue the value to set
 * @param {string} description the optional description of the option
 * @returns 
 */
Client.prototype.setOption = async function(name, rawValue, description) {
    // First, read the current option value to make sure we have the right type
    await this.getOption(name, true);
    const option = this._optionCache.getOption(name);
    // Note: option is never null or undefined there: Campaign will return a value of type 0 and value ""
    var type = option.type;
    var value = XtkCaster.as(rawValue, type);

    // Document attribute for value depends on value type
    var attName = XtkCaster._variantStorageAttribute(type);
    if (!attName) {
        // could not infer the storage type of the attribute to use to store the value (when option did not exist before) => assume string
        type = 6; 
        attName = "stringValue";
    }
    var doc = { xtkschema: "xtk:option", _operation: "insertOrUpdate", _key: "@name", name: name, dataType: type };
    if (description != null && description != undefined)
        doc.description = description;
    doc[attName] = value;
    return this.NLWS.xtkSession.write(doc).then(() => {
        // Once set, cache the value
        this._optionCache.cache(name, [value, type]);
    });
}

/**
 * Clears the options cache
 */
Client.prototype.clearOptionCache = function() {
    this._optionCache.clear();
}

/**
 * Clears the method cache
 */
Client.prototype.clearMethodCache = function() {
    this._methodCache.clear();
}

/**
 * Clears the entity cache
 */
Client.prototype.clearEntityCache = function() {
    this._entityCache.clear();
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
  return this._installedPackages[packageId] !== undefined;
}

/**
 * Obtains a cipher that can be used to encrypt/decrypt passwords, using the database secret key.
 * This is used for example for mid-sourcing account. 
 * @deprecated since version 1.0.0
 */
Client.prototype._getSecretKeyCipher = async function() {
    var that = this;
    if (this._secretKeyCipher) return this._secretKeyCipher;
    return that.getOption("XtkSecretKey").then(function(secretKey) {
        that._secretKeyCipher = new Cipher(secretKey);
        return that._secretKeyCipher;
    });
}

/**
 * Get entity
 * @param entityType is the type of entity requested, such as "xtk:schema", "xtk:srcSchema", "xtk:navtree", "xtk:form", etc.
 * @param fullName is the fully qualified name of the entity (i.e. <namespace>:<name>)
 * @return A DOM representation of the entity, or null if the entity is not found
 */
Client.prototype.getEntityIfMoreRecent = function(entityType, fullName, representation) {
    const that = this;
    const soapCall = this.prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent");
    soapCall.writeString("pk", entityType + "|" + fullName);
    soapCall.writeString("md5", "");
    soapCall.writeBoolean("mustExist", false);
    return this.makeSoapCall(soapCall).then(function() {
        var doc = soapCall.getNextDocument();
        soapCall.checkNoMoreArgs();
        doc = that.toRepresentation(doc, representation);
       return doc;
    });
}

/**
 * Get a schema definition.
 * @param {string} schemaId the schema id, such as "xtk:session", or "nms:recipient"
 * @param {string} representation an optional representation of the schema: "BadgerFish", "SimpleJson" or "xml". If not set, we'll use the client default representation
 * @returns {*} the schema definition, as either a DOM document or a JSON object
 */
Client.prototype.getSchema = async function(schemaId, representation) {
    var that = this;
    var entity = that._entityCache.get("xtk:schema", schemaId);
    if (!entity) {
        entity = await that.getEntityIfMoreRecent("xtk:schema", schemaId, "xml");
    }
    if (entity)
        that._entityCache.put("xtk:schema", schemaId, entity);

    entity = that.toRepresentation(entity, representation);
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

    if (this._representation == "BadgerFish") {
        if (schema.enumeration) {
            for (var i in schema.enumeration) {
                var e = schema.enumeration[i];
                if (e["@name"] == enumName)
                    return e;
            }
        }
    }
    else if (this._representation == "SimpleJson") {
        if (schema.enumeration) {
            for (var i in schema.enumeration) {
                var e = schema.enumeration[i];
                if (e["name"] == enumName)
                    return e;
            }
        }
    }
    else if (this._representation == "xml") {
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
        throw new Error(`Unsupported representation '${this._representation}'`);
}

/**
 * Call Campaign SOAP method
 * 
 * @param {string} methodName is the method to call. In order to be more JavaScript friendly, the first char can be lower-cased
 * @param {*} callContext the call context)
 * @param {*} parameters is an array of function parameters. When there's only one parameter, it can be passed directly
 * @returns {*} the SOAP call result. If there's just one output parameter, the value itself will be returned. If not, an array will be returned
 */
Client.prototype._callMethod = async function(methodName, callContext, parameters) {
    const that = this;
    const result = [];
    const schemaId = callContext.schemaId;
    
    var schema = await that.getSchema(schemaId, "xml");
    if (!schema)
        throw new Error(`Schema '${schemaId}' not found`);
    var schemaName = schema.getAttribute("name");
    var method = that._methodCache.get(schemaId, methodName);
    if (!method) {
        this._methodCache.cache(schema);
        method = that._methodCache.get(schemaId, methodName);
    }
    if (!method)
        throw new Error(`Method '${methodName}' of schema '${schemaId}' not found`);
    // console.log(method.toXMLString());

    var urn = that._methodCache.getSoapUrn(schemaId, methodName);
    var soapCall = that.prepareSoapCall(urn, methodName);

    const isStatic = DomUtil.getAttributeAsBoolean(method, "static");
    var object = callContext.object;
    if (!isStatic) {
        if (!object)
            throw new Error(`Cannot call non-static method '${methodName}' of schema '${schemaId}' : no object was specified`);

        const rootName = schemaId.substr(schemaId.indexOf(':') + 1);
        object = that.fromRepresentation(rootName, object);
        soapCall.writeDocument("document", object);
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
                else if (type == "int64")
                    soapCall.writeInt64(paramName, XtkCaster.asInt64(paramValue));
                else if (type == "datetime")
                    soapCall.writeTimestamp(paramName, XtkCaster.asTimestamp(paramValue));
                else if (type == "date")
                    soapCall.writeDate(paramName, XtkCaster.asDate(paramValue));
                else if (type == "DOMDocument" || type == "DOMElement") {
                    var docName = undefined;
                    // Hack for workflow API. The C++ code checks that the name of the XML element is <variables>. When
                    // using xml representation at the SDK level, it's ok since the SDK caller will set that. But this does
                    // not work when using "BadgerFish" representation where we do not know the root element name.
                    if (schemaId == "xtk:workflow" && methodName == "StartWithParameters" && paramName == "parameters")
                        docName = "variables";
                    if (schemaId == "nms:rtEvent" && methodName == "PushEvent")
                        docName = "rtEvent";
                    // Try to guess the document name. This is usually available in the xtkschema attribute
                    var xtkschema = EntityAccessor.getAttributeAsString(paramValue, "xtkschema");
                    if (!xtkschema) xtkschema = paramValue["@xtkschema"];
                    if (xtkschema) {
                        const index = xtkschema.indexOf(":");
                        docName = xtkschema.substr(index+1);
                    }
                    var xmlValue = that.fromRepresentation(docName, paramValue);
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

        if (!isStatic) {
            // Non static methods, such as xtk:query#SelectAll return a element named "entity" which is the object itself on which
            // the method is called. This is the new version of the object (in XML form)
            const entity = soapCall.getEntity();
            if (entity) {
                callContext.object = that.toRepresentation(entity);
            }
        }

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
                    else if (type == "int64")
                        // int64 are represented as strings to make sure no precision is lost
                        returnValue = soapCall.getNextInt64();
                    else if (type == "datetime")
                        returnValue = soapCall.getNextDateTime();
                    else if (type == "date")
                        returnValue = soapCall.getNextDate();
                    else if (type == "DOMDocument") {
                        returnValue = soapCall.getNextDocument();
                        returnValue = that.toRepresentation(returnValue);
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
                    else if (type == "DOMElement") {
                        returnValue = soapCall.getNextElement();
                        returnValue = that.toRepresentation(returnValue);
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
                                    returnValue = that.toRepresentation(returnValue);
                                    break;
                                }
                                element = DomUtil.getNextSiblingElement(element, "element")
                            }

                        }
/*                    else if (type == "sessionUserInfo") {
                        returnValue = soapCall.getNextElement();
                        if (that._representation == "BadgerFish")
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
 * Wrapps the /r/test
 */
Client.prototype.test = async function() {
    const that = this;
    return request({
        url: `${that._connectionParameters._endpoint}/r/test`, 
        method: 'GET',
        headers: {
            'User-Agent': that.getUserAgentString()
        }
    }).then((body) => {
        const xml = DomUtil.parse(body);
        const result = that.toRepresentation(xml);
        return result;

    }).catch((err) => {
        // TODO: this is depending on the "request" library. Should abstract this away
        throw new CampaignException({ request:err.options, response: err.response.body }, err.statusCode, "", err.error, undefined);
    });
}

/**
 * Wrapps the /nl/jsp/ping.jsp
 */
 Client.prototype.ping = async function() {
    const that = this;
    return request({
        url: `${that._connectionParameters._endpoint}/nl/jsp/ping.jsp`, 
        method: 'GET',
        headers: {
            'User-Agent': that.getUserAgentString(),
            'X-Security-Token': that._securityToken,
            'Cookie': '__sessiontoken=' + this._sessionToken
        }
    }).then((body) => {
        const lines = body.split('\n');
        const doc = DomUtil.newDocument("ping");
        const root = doc.documentElement;
        root.setAttribute("status", lines.length > 0 ? lines[0] : "undefined");
        root.setAttribute("timestamp", lines.length > 1 ? lines[1] : "");
        const result = that.toRepresentation(doc);
        return result;
    }).catch((err) => {
        // TODO: this is depending on the "request" library. Should abstract this away
        throw new CampaignException({ request:err.options, response: err.response.body }, err.statusCode, "", err.error, undefined);
    });
}


/**
 * Wrapps the /nl/jsp/mcPing.jsp
 */
 Client.prototype.mcPing = async function() {
    const that = this;
    return request({
        url: `${that._connectionParameters._endpoint}/nl/jsp/mcPing.jsp`, 
        method: 'GET',
        headers: {
            'User-Agent': that.getUserAgentString(),
            'X-Security-Token': that._securityToken,
            'Cookie': '__sessiontoken=' + this._sessionToken
        }
    }).then((body) => {
        const lines = body.split('\n');
        const doc = DomUtil.newDocument("ping");
        const root = doc.documentElement;
        const status = lines.length > 0 ? lines[0] : "undefined";
        root.setAttribute("status", status);
        var rtCount = 0;
        var threshold = 0;
        if (status == "Error") {
            const error = lines.length > 1 ? lines[1] : "";
            root.setAttribute("error", error);
            var index1 = error.indexOf('(');
            var index2 = error.indexOf('/');
            var index3 = error.indexOf(')');
            if (index1 != -1 && index2 != -1 && index3 != -1) {
                rtCount = error.substring(index+1, index2);
                threshold = error.substring(index2+1, index3);
            }
        }
        else {
            root.setAttribute("timestamp", lines.length > 1 ? lines[1] : "");
            const queue = lines.length > 2 ? lines[2] : "";
            var index2 = queue.indexOf('/');
            var index3 = queue.indexOf(' pending events');
            if (index2 != -1 && index3 != -1) {
                rtCount = queue.substring(0, index2);
                threshold = queue.substring(index2+1, index3);
            }
        }
        root.setAttribute("eventQueueSize", rtCount);
        root.setAttribute("eventQueueMaxSize", threshold);
        const result = that.toRepresentation(doc);
        return result;
    }).catch((err) => {
        // TODO: this is depending on the "request" library. Should abstract this away
        throw new CampaignException({ request:err.options, response: err.response.body }, err.statusCode, "", err.error, undefined);
    });
}


/**
 * Public exports
 */
exports.Client = Client;
exports.Credentials = Credentials;
exports.ConnectionParameters = ConnectionParameters;
