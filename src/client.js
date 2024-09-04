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
 * ACC JavaScript SDK
 * See README.md for usage
 *
 *********************************************************************************/

/**
 * Client to ACC instance
 */
const { SoapMethodCall } = require('./soap.js');
const { CampaignException, makeCampaignException } = require('./campaign.js');
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const XtkEntityCache = require('./xtkEntityCache.js').XtkEntityCache;
const Cipher = require('./crypto.js').Cipher;
const DomUtil = require('./domUtil.js').DomUtil;
const MethodCache = require('./methodCache.js').MethodCache;
const OptionCache = require('./optionCache.js').OptionCache;
const CacheRefresher = require('./cacheRefresher.js').CacheRefresher;
const request = require('./transport.js').request;
const { Application, newSchema } = require('./application.js');
const EntityAccessor = require('./entityAccessor.js').EntityAccessor;
const { Util } = require('./util.js');
const { XtkJobInterface } = require('./xtkJob.js');
const qsStringify = require('qs-stringify');

/**
 * @namespace Campaign
 *
 * @typedef {Object} SessionInfo
 * @memberOf Campaign
 *
 * @typedef {Object} RedirStatus
 * @memberOf Campaign
 *
 * @typedef {Object} PingStatus
 * @memberOf Campaign
 *
 * @typedef {Object} McPingStatus
 * @memberOf Campaign
 *
 * @typedef {Object} Observer
 * @memberOf Campaign
 *
 * @typedef {Object} ReportContext
 * @memberOf Campaign
*/

/**
 * @typedef {Object} XtkMethodParam
    * @property {string} name - the name of the parameter
    * @property {string} type - the type of the parameter
    * @property {*} value - the values of the parameter in the expected representation
    * @memberOf Campaign
 */

/**
 * Java Script Proxy handler for an XTK object. An XTK object is one constructed with the following syntax:
 *
 * <code>
 * NLWS.xtkQueryDef.create(...)
 * </code>
 *
 * Any Xtk methods can be called directly on such an object using this proxy handler which will lookup
 * the method definition and manage parameters marshalling and SOAP call
 *
 * @private
 * @memberof Campaign
 */
const xtkObjectHandler = {
    set: function(callContext, prop, value) {
        const object = callContext.object;
        object[prop] = value;
    },

    get: function(callContext, methodName) {
        if (methodName == ".") 
            return callContext;
        if (methodName === "__xtkProxy")
            return true;
        if (methodName === "save") {
            return async () => {
                return callContext.client.NLWS.xtkSession.write(callContext.object);
            };
        }
        if (methodName === "entity") {
            return callContext.object;
        }

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
};

/**
 * Java Script Proxy handler for NLWS.
 * The proxy resolves constructs such as
 *
 * <code>
 * result = await client.NLWS.xtkSession.getServerTime();
 * </code>
 *
 * To get a handler, call the `clientHandler` function and optionally pass a representation.
 * If no representation is passed (undefined), the representation set at the client level
 * will be used, which is the default behavior.
 * To get a proxy with a specific representation, use NLWS.xml or NMWS.json
 *
 * @private
 * @memberof Campaign
 */
const clientHandler = (representation, headers, pushDownOptions) => {
    return {
        get: function(client, namespace) {

            // Force XML or JSON representation (NLWS.xml or NLWS.json)
            if (namespace == "xml") return new Proxy(client, clientHandler("xml", headers, pushDownOptions));
            if (namespace == "json") return new Proxy(client, clientHandler("SimpleJson", headers, pushDownOptions));

            // Override HTTP headers (NLWS.headers({...}))
            // Unlike NLWS.xml or NLWS.json, NLWS.headers returns a function. This function takes key/value
            // pairs of headers, and, when called, returns a proxy object which will remember the headers
            // and be able to pass them to subsequent SOAP call context
            if (namespace == "headers") return (methodHeaders) => {
                // Build of copy of the http headers and append new headers in order to accomodate
                // chained calls, such as NLWS.headers(...).headers(...)
                const newHeaders = {};
                if (headers) for (let h in headers) newHeaders[h] = headers[h];
                if (methodHeaders) for (let h in methodHeaders) newHeaders[h] = methodHeaders[h];
                return new Proxy(client, clientHandler(representation, newHeaders, pushDownOptions));
            };

            // Pushes down addition options to the SOAP and transport layers
            if (namespace == "pushDown") return (methodPushDownOptions) => {
                // Build of copy of the pushDownOptions in order to accomodate
                // chained calls, such as NLWS.pushDown(...).pushDown(...)
                const newPushDownOptions = {};
                if (pushDownOptions) for (let h in pushDownOptions) newPushDownOptions[h] = pushDownOptions[h];
                if (methodPushDownOptions) for (let h in methodPushDownOptions) newPushDownOptions[h] = methodPushDownOptions[h];
                return new Proxy(client, clientHandler(representation, headers, newPushDownOptions));
            };

            return new Proxy({ client:client, namespace:namespace}, {
                get: function(callContext, methodName) {
                    callContext.representation = representation;
                    callContext.headers = callContext.headers || client._connectionParameters._options.extraHttpHeaders;
                    callContext.pushDownOptions = {};
                    if (headers) {
                        for (let h in headers) callContext.headers[h] = headers[h];
                    }
                    if (pushDownOptions) {
                        for (let h in pushDownOptions) callContext.pushDownOptions[h] = pushDownOptions[h];
                    }

                    if (methodName == ".") 
                        return callContext;

                    // get Schema id from namespace (find first upper case letter)
                    callContext.schemaId = Util.schemaIdFromNamespace(namespace);

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
                                return client._optionCache.put(optionName, optionAndValue).then(() => optionAndValue);
                            });
                        }
                        // static method
                        var result = callContext.client._callMethod(methodName, callContext, argumentsList);
                        return result;
                    };

                    if (methodName == "create") {
                        return function(body) {
                            callContext.object = body || {}; // supports empty bodies
                            if (!callContext.object.xtkschema) callContext.object.xtkschema = callContext.schemaId;
                            return new Proxy(callContext, xtkObjectHandler);
                        };
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
};

// ========================================================================================
// Campaign credentials
// ========================================================================================

/**
 * @class
 * @constructor
 * @private
 * @memberof Campaign
 */
class Credentials {

    /**
     * Credentials to a Campaign instance. Encapsulates the various types of credentials.
     * Do not create directly, use one of the methods in ConnectionParameters
     * @param {string} type the credentials type. Supported types are "UserPassword" and "ImsServiceToken" and "SessionToken" and "AnonymousUser"
     * @param {string} sessionToken the session token. It's exact form depends on the credentials type. For instance it can be "user/passord" for the "UserPassword" credentials type
     * @param {string} securityToken the security token. Will use an empty token if not specified
     */
    constructor(type, sessionToken, securityToken) {
        if (type != "UserPassword" && type != "ImsServiceToken" && type != "SessionToken" && type != "SessionAndSecurityToken" &&
            type != "AnonymousUser" && type != "SecurityToken" && type != "BearerToken" && type != "ImsBearerToken")
            throw CampaignException.INVALID_CREDENTIALS_TYPE(type);
        this._type = type;
        this._sessionToken = sessionToken || "";
        this._securityToken = securityToken || "";
        if (type == "BearerToken" || type === "ImsBearerToken") {
            this._bearerToken = sessionToken || "";
            this._sessionToken = "";
        }
    }

    /**
     * For "UserPassword" type credentials, return the user name
     *
     * @private
     * @returns {string} the user name
     */
    _getUser() {
        if (this._type != "UserPassword")
            throw CampaignException.CANNOT_GET_CREDENTIALS_USER(this._type);
        const tokens = this._sessionToken.split("/");
        const user = tokens[0];
        return user;
    }

    /**
     * For "UserPassword" type credentials, return the user password
     *
     * @private
     * @returns {string} the user password
     */
    _getPassword() {
        if (this._type != "UserPassword")
            throw CampaignException.CANNOT_GET_CREDENTIALS_PASSWORD(this._type);
        const tokens = this._sessionToken.split("/");
        const password = tokens.length > 1 ? tokens[1] : "";
        return password;
    }
}


// ========================================================================================
// Campaign connection parameters
// ========================================================================================

/**
 * @typedef {Object} ConnectionOptions
    * @property {string} representation - the representation to use, i.e. "SimpleJson" (the default), "BadgerFish", or "xml"
    * @property {boolean} rememberMe - The Campaign `rememberMe` attribute which can be used to extend the lifetime of session tokens
    * @property {number} entityCacheTTL - The TTL (in milliseconds) after which cached XTK entities expire. Defaults to 5 minutes
    * @property {number} methodCacheTTL - The TTL (in milliseconds) after which cached XTK methods expire. Defaults to 5 minutes
    * @property {number} optionCacheTTL - The TTL (in milliseconds) after which cached XTK options expire. Defaults to 5 minutes
    * @property {boolean} traceAPICalls - Activates the tracing of all API calls
    * @property {Utils.Transport} transport - Overrides the transport (i.e. HTTP layer)
    * @property {boolean} noStorage - De-activate using of local storage. By default, and in addition to in-memory cache, entities, methods, and options are also persisted in local storage if there is one.
    * @property {Storage} storage - Overrides the storage interface (i.e. LocalStorage)
    * @property {function} refreshClient - An async callback function with the SDK client as parameter, which will be called when the ACC session is expired
    * @property {string} charset - The charset encoding used for http requests. Defaults to UTF-8 since SDK version 1.1.1
    * @property {{ name:string, value:string}} extraHttpHeaders - optional key/value pair of HTTP header (will override any other headers)
    * @property {string} clientApp - optional name/version of the application client of the SDK. This will be passed in HTTP headers for troubleshooting
    * @property {boolean} noSDKHeaders - set to disable "ACC-SDK" HTTP headers
    * @property {boolean} noMethodInURL - Can be set to true to remove the method name from the URL
    * @property {number} timeout - Can be set to change the HTTP call timeout. Value is passed in ms.
    * @property {string} cacheRootKey - "default" or "none" - determine the prefix to use for the keys in the caches of schemas, options, etc.
    * @memberOf Campaign
 */


/**
 * @class
 * @constructor
 * @memberof Campaign
 */
class ConnectionParameters {

    /**
     * Creates a connection parameters object which can be used to create a Client object
     * to connect to a Campaign instance
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {Campaign.Credentials} credentials The credentials for the connection
     * @param {Campaign.ConnectionOptions} options connection options
     */
    constructor(endpoint, credentials, options) {
        // this._options will be populated with the data from "options" and with
        // default values. But the "options" parameter will not be modified
        this._options = Object.assign({}, options);

        // Default value
        if (options === undefined || options === null)
            options = { };
        // Before version 1.0.0, the 4th parameter could be a boolean for the 'rememberMe' option.
        // Passing a boolean is not supported any more in 1.0.0. The Client constructor takes an
        // option object. The rememberMe parameter can be passed directly to the logon function
        if (typeof options  != "object")
            throw CampaignException.INVALID_CONNECTION_OPTIONS(options);

        this._options.representation = options.representation;
        if (this._options.representation === undefined || this._options.representation === null)
            this._options.representation = "SimpleJson";

        if (this._options.representation != "xml" && this._options.representation != "BadgerFish" && this._options.representation != "SimpleJson")
            throw CampaignException.INVALID_REPRESENTATION(this._options.representation, "Cannot create Campaign client");

        // Defaults for rememberMe
        this._options.rememberMe = !!options.rememberMe;

        this._options.entityCacheTTL = options.entityCacheTTL || 1000*300; // 5 mins
        this._options.methodCacheTTL = options.methodCacheTTL || 1000*300; // 5 mins
        this._options.optionCacheTTL = options.optionCacheTTL || 1000*300; // 5 mins
        this._options.traceAPICalls = options.traceAPICalls === null || options.traceAPICalls ? !!options.traceAPICalls : false;
        this._options.transport = options.transport || request;

        this._endpoint = endpoint;
        this._credentials = credentials;

        var storage;
        if (!options.noStorage) {
            storage = options.storage;
            try {
                if (!storage)
                    storage = localStorage;
            } catch (ex) {
                /* ignore error if localStorage not found */
            }
        }
        this._options._storage = storage;
        this._options.refreshClient = options.refreshClient;
        this._options.charset = options.charset === undefined ? "UTF-8": options.charset;
        this._options.extraHttpHeaders = {};
        if (options.extraHttpHeaders) {
            for (let h in options.extraHttpHeaders) this._options.extraHttpHeaders[h] = options.extraHttpHeaders[h];
        }
        this._options.clientApp = options.clientApp;
        this._options.noSDKHeaders = !!options.noSDKHeaders;
        this._options.noMethodInURL = !!options.noMethodInURL;
        this._options.cacheRootKey = options.cacheRootKey === undefined ? "default": options.cacheRootKey;
    }

    /**
     * Creates connection parameters for a Campaign instance, using a user name and password
     *
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} user The user name
     * @param {string} password The user password
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofUserAndPassword(endpoint, user, password, options) {
        const credentials = new Credentials("UserPassword", `${user}/${password}`, "");
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance from bearer token.
     * This authentication method uses an IMS Bearer token and calls the xtk:session#BearerTokenLogin method
     * which will exchange the IMS bearer token with Campaign session and security tokens.
     * This is a legacy method. Campaign 8.5 will has an authentication method which allows to directly
     * use the IMS bearer token and which is recommended. 
     * To avoid an extra call to "BearerTokenLogin", use the "ofImsBearerToken" method.
     * 
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} bearerToken IMS bearer token
     * @param {*} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofBearerToken(endpoint, bearerToken, options) {
        const credentials = new Credentials("BearerToken", bearerToken);
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance from a IMS bearer token.
     * This authentication method does not require exchange the IMS token with session and security tokens
     * and only works in ACC 8.5 and above.
     * For older version of ACC or to use session/seurity tokens, use the "ofBearerToken" method.
     * 
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} bearerToken IMS bearer token
     * @param {*} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofImsBearerToken(endpoint, bearerToken, options) {
        const credentials = new Credentials("ImsBearerToken", bearerToken);
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance, using an IMS service token and a user name (the user to impersonate)
     *
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} user The user name
     * @param {string} serviceToken The IMS service token
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofUserAndServiceToken(endpoint, user, serviceToken, options) {
        const credentials = new Credentials("ImsServiceToken", `_ims_/${user}/${serviceToken}`, "");
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance, using a session token
     *
     * @static
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} sessionToken The session token
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofSessionToken(endpoint, sessionToken, options) {
        const credentials = new Credentials("SessionToken", sessionToken, "");
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance, using a session token and a security token
     *
     * @static
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} sessionToken The session token
     * @param {string} securityToken The security token
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofSessionAndSecurityToken(endpoint, sessionToken, securityToken, options) {
        const credentials = new Credentials("SessionAndSecurityToken", sessionToken, securityToken);
        return new ConnectionParameters(endpoint, credentials, options);
    }
    
    /**
     * Creates connection parameters for a Campaign instance, using a security token.
     * Typically, called when embedding the SDK in Campaign: the session token will be
     * passed automatically as a cookie, so only the security token is actually needed
     * to logon
     *
     * @static
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {string} securityToken The security token
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofSecurityToken(endpoint, securityToken, options) {
        const credentials = new Credentials("SecurityToken", "", securityToken);
        return new ConnectionParameters(endpoint, credentials, options);
    }

    /**
     * Creates connection parameters for a Campaign instance for an anonymous user
     *
     * @param {string} endpoint The campaign endpoint (URL)
     * @param {Campaign.ConnectionOptions} options connection options
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static ofAnonymousUser(endpoint, options) {
        const credentials = new Credentials("AnonymousUser", "", "");
        return new ConnectionParameters(endpoint, credentials, options);
    }


    /**
     * Creates connection parameters for a Campaign instance, using an external account. This can be used to connect
     * to a mid-sourcing instance, or to a message center instance. This function will lookup the external account,
     * and use its credentials to get connection parameters to the corresponding Campaign instance
     *
     * @param {Client} client The Campaign Client from which to lookup the external account (normally, a connected client to the marketing instance)
     * @param {string} extAccountName The name of the external account. Only mid-sourcing accounts (type 3) are supported
     * @returns {ConnectionParameters} a ConnectionParameters object which can be used to create a Client
     */
    static async ofExternalAccount(client, extAccountName) {
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
        };
        // Convert to current representation
        queryDef = client._convertToRepresentation(queryDef, "SimpleJson");
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
        throw CampaignException.CREDENTIALS_FOR_INVALID_EXT_ACCOUNT(extAccountName, type);
    }

}

// ========================================================================================
// File Uploader
// ========================================================================================

/**
 * @typedef {Object} FileUploadOptions
 * @property {"publishIfNeeded"|"none"|undefined} the post-processing action to execute. Defaults to "publishIfNeeded"
 * @memberOf Campaign
 */


/**
 * File Uploader API for JS SDK(Currently available only in browsers)
 * @private
 * @ignore
 * @memberof Campaign
 * @param client
 * @returns {{upload: (function(*=): Promise<{name: string, md5: string, type: string, size: string, url: string}>)}}
 */
const fileUploader = (client) => {

    return {
        /**
         * This is the exposed/public method for fileUploader instance which will do all the processing related to the upload process internally and returns the promise containing all the required data.
         * @ignore
         * @param file, where file is an instance of [File](https://developer.mozilla.org/en-US/docs/Web/API/File)
         * @param {FileUploadOptions|undefined} options
         * @returns {Promise<{name: string, md5: string, type: string, size: string, url: string}>}
         */
        upload: (file, options) => {
            console.log(`fileuploader.upload is an experimental feature and is not currently fully functional. It is work in progress and will change in the future.`);
            return new Promise((resolve, reject) => {
                const action = (options && options.action) ? options.action : "publishIfNeeded";
                if (action !== "publishIfNeeded" && action !== "none")
                    reject(CampaignException.BAD_PARAMETER("action", action, "The 'action' parameter of the upload API should be 'publishIfNeeded' or 'none'"));
                try {
                    if (!Util.isBrowser()) {
                        throw 'File uploading is only supported in browser based calls.';
                    }
                    const data = new FormData();
                    data.append('file_noMd5', file);
                    const headers = client._getAuthHeaders(false);
                    for (let h in client._connectionParameters._options.extraHttpHeaders)
                        headers[h] = client._connectionParameters._options.extraHttpHeaders[h];
                    client._makeHttpCall({
                        url: `${client._connectionParameters._endpoint}/nl/jsp/uploadFile.jsp`,
                        processData: false,
                        method: 'POST',
                        data: data,
                        headers: headers
                    }).then((okay) => {
                        if (!okay.startsWith('Ok')) {
                            throw okay;
                        }
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'block';
                        iframe.style.border = 'none';
                        iframe.style.height = 0;
                        iframe.style.width = 0;
                        if(options && options.className) {
                            iframe.className = options.className;
                        }
                        document.controller = { // Written to  support https://git.corp.adobe.com/Campaign/ac/blob/v6-master/nl/datakit/nl/jsp/uploadFile.jsp
                            uploadFileCallBack: async (data) => {
                                if (!data || data.length !== 1) {
                                    // Tried to replicate the logic for file upload functionality written here:
                                    // https://git.corp.adobe.com/Campaign/ac/blob/v6-master/wpp/xtk/web/dce/uploader.js
                                    return reject(CampaignException.FILE_UPLOAD_FAILED(file.name, 'Malformed data:' + data.toString()));
                                }
                                const result = {
                                    name: data[0].fileName,
                                    md5: data[0].md5,
                                    type: file.type,
                                    size: file.size,
                                };
                                if (action === "publishIfNeeded") {
                                  try {
                                    const counter =
                                      await client.NLWS.xtkCounter.increaseValue(
                                        { name: 'xtkResource' }
                                      );
                                    const fileRes = {
                                      internalName: 'RES' + counter,
                                      md5: data[0].md5,
                                      label: data[0].fileName,
                                      fileName: data[0].fileName,
                                      originalName: data[0].fileName,
                                      useMd5AsFilename: '1',
                                      storageType: 5,
                                      xtkschema: 'xtk:fileRes',
                                    };
                                    await client.NLWS.xtkSession.write(fileRes);
                                    await client.NLWS.xtkFileRes
                                      .create(fileRes)
                                      .publishIfNeeded();
                                    const url = await client.NLWS.xtkFileRes
                                      .create(fileRes)
                                      .getURL();
                                    result.url = url;
                                  } catch (ex) {
                                    reject(
                                      CampaignException.FILE_UPLOAD_FAILED(
                                        file.name,
                                        ex
                                      )
                                    );
                                  }
                                }
                                resolve(result);
                            }
                        };
                        const html = `<body>${okay}</body>`;
                        document.body.appendChild(iframe);
                        iframe.contentWindow.document.open();
                        iframe.contentWindow.document.write(html);
                        iframe.contentWindow.document.close();
                    }).catch((ex) => {
                        reject(CampaignException.FILE_UPLOAD_FAILED(file.name, ex));
                    });
                } catch (ex) {
                    reject(CampaignException.FILE_UPLOAD_FAILED(file.name, ex));
                }
            });
        },

        /**
         * Exposed method to call aemAssetDownload.jssp which will
         * download the asset from AEM and upload it to Campaign.
         */
        uploadAemAsset: async (assetDownloadUrl) => {
            const url = `${client._connectionParameters._endpoint}/nms/aemAssetDownload.jssp`;
            const headers = client._getAuthHeaders(false);
            headers['Content-Type'] = 'application/json';

            try {
                // We need to pass the Authorization header to AEM to download the asset from AEM
                // as well as authenticating campaign server.
                // A user token having access to campaign as well as AEM is required
                if(headers['Authorization'] === undefined || headers['Authorization'] === '' || headers['Authorization'] === 'null') {
                    throw 'Bearer token is missing';
                }
                // Serialize json data (required for fetch)
                const jsonData = JSON.stringify({
                    'assetDownloadUrl': assetDownloadUrl
                });
                for (let h in client._connectionParameters._options.extraHttpHeaders)
                    headers[h] = client._connectionParameters._options.extraHttpHeaders[h];
                var response = await client._makeHttpCall({
                    url: url,
                    method: 'POST',
                    data: jsonData,
                    headers: headers
                });

                // response is returned as string when using fetch(in browser)
                // & returned as json using axios(nodejs).
                if(typeof response === 'string')
                  response = JSON.parse(response);
                if(response.publishedURL)
                  return response;
                else
                  throw 'Publishing failed';
            } catch (ex) {
                if(ex instanceof CampaignException)
                    throw CampaignException.AEM_ASSET_UPLOAD_FAILED(ex.faultString, ex.statusCode);
                else
                  throw CampaignException.AEM_ASSET_UPLOAD_FAILED(ex, ex.statusCode);
            }
        },

        /**
         * Exposed public method of the fileUploader api,
         * specifically designed to download files from the 'upload' folder of the Campaign instance
         * @param {string} md5 md5 of the file content
         * @param {string} ext (original) file extension
         * @param {Object | undefined} options
         * @param {string} options.fileName to rename the name in save as dialog of web browser 
         * (force this dialog) must be in UTF-8
         * @param {string} options.contentType change the content-type of the response (to help browser to
         * handle this file) expl : image/png, text/plain;charset=ISO-8859-1
         * @returns {Promise<File(string)>}
         */
        download: async (md5, ext, options) => {
          if (!md5 || typeof md5 !== 'string') {
            throw CampaignException.BAD_PARAMETER(
                "md5",
                md5,
                "'md5' is mandatory parameter with type as 'string' for download file."
              );
          }

          if (!ext || typeof ext !== "string") {
            throw CampaignException.BAD_PARAMETER(
                "ext",
                ext,
                "'ext' is mandatory parameter with type as 'string' for download file."
              );
          }

          try {
            const fileName =
              options && options.fileName ? options.fileName : md5;
            const contentType =
              options && options.contentType ? options.contentType : "";

            let queryString = `md5=${encodeURIComponent(md5)}&ext=${encodeURIComponent(ext)}&fileName=${encodeURIComponent(fileName)}`;

            if (contentType) {
              queryString += `&contentType=${encodeURIComponent(contentType)}`;
            }

            const headers = client._getAuthHeaders(false);
            for (let h in client._connectionParameters._options.extraHttpHeaders)
                headers[h] = client._connectionParameters._options.extraHttpHeaders[h];
            const rawFileResponse = await client._makeHttpCall({
              url: `${client._connectionParameters._endpoint}/nl/jsp/downloadFile.jsp?${queryString}`,
              headers: headers,
            });

            return rawFileResponse;
          } catch (ex) {
            throw CampaignException.FILE_DOWNLOAD_FAILED(md5, ex);
          }
        }

    };
};


// ========================================================================================
// ACC Client
// ========================================================================================

/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class Client {

    /**
     * ACC API Client.
     * Do not create directly, use SDK.init instead
     *
     * @param {Campaign.SDK} sdk is the global sdk object used to create the client
     * @param {Campaign.ConnectionParameters} user user name, for instance admin
     */
    constructor(sdk, connectionParameters) {
        this.sdk = sdk;
        this.reinit(connectionParameters);

        this._observers = [];
        this._cacheChangeListeners = [];
    }

    /**
     * Re-initialize a client with new connection parameters.
     * Typically called from the refreshClient callback after a connection expires.
     * Conserves observers
     *
     * @param {Campaign.ConnectionParameters} user user name, for instance admin
     */
    reinit(connectionParameters) {
        this._connectionParameters = connectionParameters; // ## TODO security concern (password kept in memory)
        this._representation = connectionParameters._options.representation;

        this._sessionInfo = undefined;
        this._sessionToken = undefined;
        this._securityToken = undefined;
        this._bearerToken = undefined;      // set when using Bearer authentication and "ImsBearer" credential type
        this._installedPackages = {};       // package set (key and value = package id, ex: "nms:amp")

        this._secretKeyCipher = undefined;

        this._storage = connectionParameters._options._storage;
        // TODO late cache initiallzation because need XtkDatabaseId / instance name
        var instanceKey = connectionParameters._endpoint || "";
        if (instanceKey.startsWith("http://")) instanceKey = instanceKey.substr(7);
        if (instanceKey.startsWith("https://")) instanceKey = instanceKey.substr(8);

        // Determine the cache root key. There are 3 possible values:
        // * no value or "default" is the default behavior, i.e. all cache keys are prefixed with "acc.js.sdk.${sdk.getSDKVersion().version}.${instanceKey}.cache."
        // * "none" (or actually anything else for now), where cache keys are not prefixed by anything
        const rootKeyType = connectionParameters._options.cacheRootKey;
        let rootKey = "";
        if (!rootKeyType || rootKeyType === "default")
            rootKey = `acc.js.sdk.${this.sdk.getSDKVersion().version}.${instanceKey}.cache.`;

        // Clear storage cache if the sdk versions or the instances are different
        if (this._storage && typeof this._storage.removeItem === 'function') {
          for (let key in this._storage) {
            if (key.startsWith("acc.js.sdk.") && !key.startsWith(rootKey)) {
              this._storage.removeItem(key);
            }
          }
        }

        this._entityCache = new XtkEntityCache(this._storage, `${rootKey}XtkEntityCache`, connectionParameters._options.entityCacheTTL);
        this._entityCacheRefresher = new CacheRefresher(this._entityCache, this, "xtk:schema", `${rootKey}XtkEntityCache`);
        this._methodCache = new MethodCache(this._storage, `${rootKey}MethodCache`, connectionParameters._options.methodCacheTTL);
        this._optionCache = new OptionCache(this._storage, `${rootKey}OptionCache`, connectionParameters._options.optionCacheTTL);
        this._optionCacheRefresher = new CacheRefresher(this._optionCache, this, "xtk:option", `${rootKey}OptionCache`);
        this.NLWS = new Proxy(this, clientHandler());

        this._transport = connectionParameters._options.transport;
        this._traceAPICalls = connectionParameters._options.traceAPICalls;
        this._refreshClient = connectionParameters._options.refreshClient;

        // expose utilities
        /**
         * File Uploader API
         * @type {{upload: (function(*=): Promise<{name: string, md5: string, type: string, size: string, url: string}>)}}
         */
        this.fileUploader = fileUploader(this);

        /**
         * Accessor to DOM helpers
         * @type {XML.DomUtil}
         */
        this.DomUtil = DomUtil;
        /**
         * Accessor to a XtkCaster
         * @type {XtkCaster}
         */
        this.XtkCaster = XtkCaster;
        /**
         * The application object. Only valid when logged
         * @type {Campaign.Application}
         */
        this.application = null;

        // Context for observability. See logon() function which will fill this context
        this._lastStatsReport = Date.now();
        this._observabilityContext = {
            eventId: 0,
            client: {
                sdkVersion: this.sdk.getSDKVersion().version,
                endpoint: this._connectionParameters._endpoint,
                createdAt: Date.now(),
                clientApp: this._connectionParameters._options.clientApp,
            }
        };
        if  (this._connectionParameters._credentials) {
            this._observabilityContext.client.type = this._connectionParameters._credentials.type;
        }
    }

    /**
     * Override the transport. By default, we are using axios, but this can be customised.
     * See transport.js and documentation in the README for more details
     * @param {*} transport
     */
    setTransport(transport) {
        this._transport = transport;
    }

    /**
     * Get the user agent string to use in all HTTP requests
     *
     * @returns {string} the user agent string
     */
    _getUserAgentString() {
        const version = this.sdk.getSDKVersion();
        return `${version.name}/${version.version} ${version.description}`;
    }

    /**
     * Get HTTP authentication headers
     * @param
     * @returns {Object} the headers
     */
    _getAuthHeaders(setCookie) {
        const headers = {};
        if (this._bearerToken) {
            headers['Authorization'] = `Bearer ${this._bearerToken}`;
        }
        else {
            headers['X-Security-Token'] = this._securityToken;
            headers['X-Session-Token'] = this._sessionToken;
            if (setCookie) {
                headers['Cookie'] = '__sessiontoken=' + this._sessionToken;
            }
        }
        return headers;
    }

    /**
     * Convert an XML object into a representation
     *
     * @private
     * @param {DOMElement} xml the XML DOM element to convert
     * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
     * @returns {XML.XtkObject} the object converted in the requested representation
     */
    _toRepresentation(xml, representation) {
        representation = representation || this._representation;
        if (representation == "xml")
            return xml;
        if (representation == "BadgerFish" || representation == "SimpleJson")
            return DomUtil.toJSON(xml, representation);
        throw CampaignException.INVALID_REPRESENTATION(this._representation, "Cannot convert XML document to this representation");
    }

    /**
     * Convert to an XML object from a representation
     *
     * @private
     * @param {string} rootName the name of the root XML element
     * @param {XML.XtkObject} entity the object to convert
     * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
     * @returns {DOMElement} the object converted to XML
     */
    _fromRepresentation(rootName, entity, representation) {
        representation = representation || this._representation;
        if (representation == "xml")
            return entity;
        if (representation == "BadgerFish" || representation == "SimpleJson") {
            var xml = DomUtil.fromJSON(rootName, entity, representation);
            return xml;
        }
        throw CampaignException.INVALID_REPRESENTATION(this._representation, "Cannot convert to XML from this representation");
    }

    /**
     * Convert between 2 representations
     *
     * @private
     * @param {XML.XtkObject} entity the object to convert
     * @param {string} fromRepresentation the source representation ('xml', 'BadgerFish', or 'SimpleJson').
     * @param {string} toRepresentation the target representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
     * @returns {DOMElement} the converted object
     */
    _convertToRepresentation(entity, fromRepresentation, toRepresentation) {
        toRepresentation = toRepresentation || this._representation;
        if (this._isSameRepresentation(fromRepresentation, toRepresentation))
            return entity;
        var xml = this._fromRepresentation("root", entity, fromRepresentation);
        entity = this._toRepresentation(xml, toRepresentation);
        return entity;
    }

    /**
     * Compare two representations
     *
     * @private
     * @param {string} rep1 the first representation ('xml', 'BadgerFish', or 'SimpleJson')
     * @param {string} rep2 the second representation ('xml', 'BadgerFish', or 'SimpleJson')
     * @returns a boolean indicating if the 2 representations are the same or not
     */
    _isSameRepresentation(rep1, rep2) {
        if (!rep1 || !rep2) throw CampaignException.INVALID_REPRESENTATION(undefined, "Cannot compare to undefined representation");
        if (rep1 != "xml" && rep1 != "SimpleJson" && rep1 != "BadgerFish") throw CampaignException.INVALID_REPRESENTATION(rep1, "Cannot compare to invalid representation");
        if (rep2 != "xml" && rep2 != "SimpleJson" && rep2 != "BadgerFish") throw CampaignException.INVALID_REPRESENTATION(rep2, "Cannot compare to invalid representation");
        if (rep1 == rep2) return true;
        return rep1 == rep2;
    }

    /**
     * Activate / deactivate tracing of API calls
     *
     * @param {boolean} trace indicates whether to activate tracing or not
     */
    traceAPICalls(trace) {
        this._traceAPICalls = !!trace;
    }

    /**
     * Registers an observer
     * @param {Campaign.Observer} observer
     */
    registerObserver(observer) {
        this._observers.push(observer);
    }

    /**
     * Unregisters an observer
     * @param {Campaign.Observer} observer
     */
    unregisterObserver(observer) {
        for (var i=0; i<this._observers.length; i++) {
            if (this._observers[i] == observer) {
                this._observers.splice(i, 1);
                break;
            }
        }
    }

    unregisterAllObservers() {
        this._observers = [];
    }

    _notifyObservers(callback) {
        this._observers.map((observer) => callback(observer));
    }

    _trackEvent(eventName, parentEvent, payload, pushDownOptions) {
        try {
            if (payload && payload.name === 'CampaignException') {
                payload = {
                    detail: payload.detail,
                    errorCode: payload.errorCode,
                    faultCode: payload.faultCode,
                    faultString: payload.faultString,
                    message: payload.message,
                    statusCode: payload.statusCode,
                };
            }
            this._observabilityContext.eventId = this._observabilityContext.eventId + 1;
            const now = Date.now();
            const event = {
                client: this._observabilityContext.client,
                session: this._observabilityContext.session,
                eventId: this._observabilityContext.eventId,
                eventName: eventName,
                payload: payload,
                timestamp: now,
            };
            if (pushDownOptions) {
                event.pushDownOptions = pushDownOptions;
            }
            if (parentEvent) event.parentEventId = parentEvent.eventId;
            this._notifyObservers((observer) => observer.event && observer.event(event, parentEvent));

            // Regularly report internal stats every 5 mins
            if ((now - this._lastStatsReport) >= 300000) {
                this._lastStatsReport = now;
                this._trackInternalStats();
            }

            return event;
        } catch (error) {
            console.info(`Failed to track observability event`, error);
        }
    }

    _trackInternalStats() {
        this._trackCacheStats('entityCache', this._entityCache);
        this._trackCacheStats('optionCache', this._optionCache);
        this._trackCacheStats('methodCache', this._methodCache);
    }

    _trackCacheStats(name, cache) {
        if (!cache || !cache._stats) return;
        this._trackEvent('CACHE//stats', undefined, {
            name: name,
            reads: cache._stats.reads,
            writes: cache._stats.writes,
            removals: cache._stats.removals,
            clears: cache._stats.clears,
            memoryHits: cache._stats.memoryHits,
            storageHits: cache._stats.storageHits,
            loads: cache._stats.loads,
            saves: cache._stats.saves,
        });
    }

    /**
     * Is the client logged?
     *
     * @returns {boolean} a boolean indicating if the client is logged or not
     */
    isLogged() {
        if (!this._connectionParameters._credentials)
            return false;

        // If using anonymous credentials => always logged
        const credentialsType = this._connectionParameters._credentials._type;
        if (credentialsType == "AnonymousUser")
            return true;
        else if (credentialsType == "ImsBearerToken") {
            return !!this._bearerToken;
        }

        // When using bearer token authentication we are considered logged only after
        // the bearer token has been converted into session token and security token
        // by method xtk:session#BearerTokenLogon
        if( credentialsType == "BearerToken")
            return this._sessionToken != undefined &&
                   this._sessionToken != null &&
                   this._sessionToken != "" &&
                   this._securityToken != undefined &&
                   this._securityToken != null &&
                   this._securityToken != "";

        // with session token authentication, we do not expect a security token
        // with security token authentication, we do not expect a session token
        const needsSecurityToken = credentialsType != "SessionToken";
        const hasSecurityToken = this._securityToken !== null && this._securityToken !== undefined && this._securityToken !== "";
        const needsSessionToken = credentialsType != "SecurityToken";
        const hasSessionToken = this._sessionToken !== null && this._sessionToken !== undefined && this._sessionToken !== "";

        return (!needsSecurityToken || hasSecurityToken) && (!needsSessionToken || hasSessionToken);
    }

    /**
     * Prepares a SOAP call, including authentication, headers...
     *
     * @private
     * @param {string} urn is the API name space, usually the schema. For instance xtk:session
     * @param {string} method is the method to call, for instance Logon
     * @param {boolean} isStatic is a boolean indicating if the method is static or not
     * @param {boolean} internal is a boolean indicating whether the SOAP call is performed by the SDK (internal = true) or on behalf of a user
     * @return {SOAP.SoapMethodCall} a SoapMethodCall which have been initialized with security tokens... and to which the method
     * parameters should be set
     */
    _prepareSoapCall(urn, method, isStatic, internal, extraHttpHeaders, pushDownOptions) {
        const soapCall = new SoapMethodCall(this._transport, urn, method,
                                            this._sessionToken, this._securityToken,
                                            this._getUserAgentString(),
                                            Object.assign({}, this._connectionParameters._options, pushDownOptions),
                                            extraHttpHeaders,
                                            this._bearerToken);
        soapCall.internal = !!internal;
        soapCall.isStatic = isStatic;
        return soapCall;
    }

    /**
     * Retry a a SOAP call
     *
     * @private
     * @return {SOAP.SoapMethodCall} a SoapMethodCall to retry
     * parameters should be set
     */
    async _retrySoapCall(soapCall) {
        soapCall.retry = false;
        soapCall._retryCount = soapCall._retryCount + 1;
        var newClient = await this._refreshClient(this);
        soapCall.finalize(newClient._soapEndPoint(), newClient);
        const safeCallData = Util.trim(soapCall.request.data);
        if (this._traceAPICalls) {
            console.log(`RETRY SOAP//request ${safeCallData}`);
        }
        const pushDownOptions = soapCall._pushDownOptions;
        const event = this._trackEvent('SOAP//request', undefined, {
            urn: soapCall.urn,
            methodName: soapCall.methodName,
            internal: soapCall.internal,
            retry: true,
            retryCount: soapCall._retryCount,
            safeCallData: safeCallData,
        }, pushDownOptions);
        try {
            await soapCall.execute();
            const safeCallResponse = Util.trim(soapCall.response);
            if (this._traceAPICalls) {
                console.log(`SOAP//response ${safeCallResponse}`);
            }
            this._trackEvent('SOAP//response', event, { safeCallResponse: safeCallResponse }, pushDownOptions);
        } catch(error) {
            this._trackEvent('SOAP//failure', event, error, pushDownOptions);
            throw error;
        }
        return;
    }

    /**
     *  SOAP Endpoint
     *
     * @private
     * @return {string} soap call End point
     */
    _soapEndPoint() {
        return this._connectionParameters._endpoint + "/nl/jsp/soaprouter.jsp";
    }

    // Serializes parameters for a SOAP call
    // @param {string} entitySchemaId is the id of the schema of the entity underlying the SOAP call
    // @param {DOMDocument} schema is the XML schema of the method call
    // @param {SOAP.SoapMethodCall} soapCall is the SOAP call being performed
    // @param {Campaign.XtkMethodParam[]} inputParameters is the list of input parameters. The first paramater in the array is the "this" parameter for non-static method calls
    // @param {string} representation is the representation to use to interpret the input parameters
    async _writeSoapCallParameters(entitySchemaId, schema, soapCall, inputParameters, representation) {
        const methodName = soapCall.methodName;
        var isThisParam = !soapCall.isStatic;

        for (const ip of inputParameters) {
            const type = ip.type;
            const paramName = ip.name;
            var paramValue = ip.value;

            if (type == "string")
                soapCall.writeString(ip.name, XtkCaster.asString(ip.value));    
            else if (type == "primarykey")
                soapCall.writeString(ip.name, XtkCaster.asString(ip.value));
            else if (type == "boolean")
                soapCall.writeBoolean(ip.name, XtkCaster.asBoolean(ip.value));
            else if (type == "byte")
                soapCall.writeByte(ip.name, XtkCaster.asByte(ip.value));
            else if (type == "short")
                soapCall.writeShort(ip.name, XtkCaster.asShort(ip.value));
            else if (type == "int")
                soapCall.writeLong(ip.name, XtkCaster.asLong(ip.value));
            else if (type == "long")
                soapCall.writeLong(ip.name, XtkCaster.asLong(ip.value));
            else if (type == "int64")
                soapCall.writeInt64(ip.name, XtkCaster.asInt64(ip.value));
            else if (type == "datetime")
                soapCall.writeTimestamp(ip.name, XtkCaster.asTimestamp(ip.value));
            else if (type == "date")
                soapCall.writeDate(ip.name, XtkCaster.asDate(ip.value));
            else if (type == "DOMDocument" || type == "DOMElement") {
                var docName = undefined;    
                let paramRepresentation = representation;
                if (paramValue.__xtkProxy) {
                    // A xtk proxy object is passed as a parameter. The call context contains the schema so we
                    // can use it to determine the XML document root (docName)
                    const paramValueContext = paramValue["."];
                    paramValue = paramValueContext.object;
                    const xtkschema = paramValueContext.schemaId;
                    const index = xtkschema.indexOf(":");
                    docName = xtkschema.substring(index+1);
                    paramRepresentation = paramValueContext.representation; // xtk proxy may have it's own representation
                }
                else {
                    // Hack for workflow API. The C++ code checks that the name of the XML element is <variables>. When
                    // using xml representation at the SDK level, it's ok since the SDK caller will set that. But this does
                    // not work when using "BadgerFish" representation where we do not know the root element name.
                    if (entitySchemaId == "xtk:workflow" && paramName == "parameters" && (
                        methodName == "StartWithParameters" || methodName == "PostEvent" || methodName == "SimulateWithParameters" ||
                        methodName == "SpawnWithParameters" || methodName == "SpawnWithParametersEx") )
                        docName = "variables";
                    if (entitySchemaId == "nms:rtEvent" && methodName == "PushEvent")
                        docName = "rtEvent";
                    // Try to guess the document name. This is usually available in the xtkschema attribute
                    var xtkschema = EntityAccessor.getAttributeAsString(paramValue, "xtkschema");
                    if (!xtkschema) xtkschema = paramValue["@xtkschema"];
                    if (xtkschema) {
                        const index = xtkschema.indexOf(":");
                        docName = xtkschema.substring(index+1);
                    }
                    if (!docName) docName = paramName; // Use te parameter name as the XML root element
                }
                var xmlValue = this._fromRepresentation(docName, paramValue, paramRepresentation || representation);
                if (type == "DOMDocument") {
                    if (isThisParam) {
                        isThisParam = false;
                        // The xtk:persist#NewInstance requires a xtkschema attribute which we can compute here
                        // Actually, we're always adding it, for all non-static methods
                        const xmlRoot = xmlValue.nodeType === 9 ? xmlValue.documentElement : xmlValue;
                        if (!xmlRoot.hasAttribute("xtkschema"))
                            xmlRoot.setAttribute("xtkschema", entitySchemaId);
                        soapCall.writeDocument("document", xmlValue);
                    }
                    else
                        soapCall.writeDocument(paramName, xmlValue);
                }
                else
                    soapCall.writeElement(paramName, xmlValue);
            }
            else
                throw CampaignException.BAD_SOAP_PARAMETER(soapCall, paramName, paramValue, `Unsupported parameter type '${type}' for parameter '${paramName}' of method '${methodName}' of schema '${entitySchemaId}`);
        }
    }

    // Deserializes results for a SOAP call
    // @param {string} entitySchemaId is the id of the schema of the entity underlying the SOAP call
    // @param {DOMDocument} schema is the XML schema of the method call
    // @param {SOAP.SoapMethodCall} soapCall is the SOAP call being performed
    // @param {Campaign.XtkMethodParam[]}  outputParameters is the list of output parameters. The first paramater in the array is the "this" parameter for non-static method calls
    // @param {string} representation is the representation to use to interpret the parameters
    async _readSoapCallResult(entitySchemaId, schema, soapCall, outputParameters, representation) {
        const methodName = soapCall.methodName;
        var isThisParam = !soapCall.isStatic;
        for (const op of outputParameters) {
            const type = op.type;
            const paramName = op.name;
            var returnValue = op.value;

            if (isThisParam) {
                isThisParam = false;
                // Non static methods, such as xtk:query#SelectAll return a element named "entity" which is the object itself on which
                // the method is called. This is the new version of the object (in XML form)
                const entity = soapCall.getEntity();
                if (entity)
                    returnValue = this._toRepresentation(entity, representation);
            }
            else if (type == "string")
                returnValue = soapCall.getNextString();
            else if (type == "primarykey")
                returnValue = soapCall.getNextPrimaryKey();
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
                returnValue = this._toRepresentation(returnValue, representation);
            }
            else if (type == "DOMElement") {
                returnValue = soapCall.getNextElement();
                returnValue = this._toRepresentation(returnValue, representation);
            }
            else {
                const schemaName = entitySchemaId.substring(entitySchemaId.indexOf(':') + 1);
                // type can reference a schema element. The naming convension is that the type name
                // is {schemaName}{elementNameCamelCase}. For instance, the type "sessionUserInfo"
                // matches the "userInfo" element of the "xtkSession" schema
                let element;
                if (type.substr(0, schemaName.length) == schemaName) {
                    const shortTypeName = type.substr(schemaName.length, 1).toLowerCase() + type.substr(schemaName.length + 1);
                    element = DomUtil.getFirstChildElement(schema, "element");
                    while (element) {
                        if (element.getAttribute("name") == shortTypeName) {
                            // Type found in schema: Process as a DOM element
                            returnValue = soapCall.getNextElement();
                            returnValue = this._toRepresentation(returnValue, representation);
                            break;
                        }
                        element = DomUtil.getNextSiblingElement(element, "element");
                    }

                }
                if (!element)
                    throw CampaignException.UNEXPECTED_SOAP_RESPONSE(soapCall, `Unsupported return type '${type}' for parameter '${paramName}' of method '${methodName}' of schema '${entitySchemaId}'`);
            }
            op.value = returnValue;
        }
        soapCall.checkNoMoreArgs();
    }

    /**
     * Serialize input parameters, make a SOAP call and deserialize result parameters. Calls observer when necessary.
     * 
     * The inputParams and outputParams arrays contain prepopulated parameter lists with the name, type (and value for
     * input params). This function does not return anything but will populate the outputParams array with the actual result.
     *
     * @private
     * @param {string} entitySchemaId is the id of the schema of the entity underlying the SOAP call
     * @param {DOMDocument} schema is the XML schema of the method call
     * @param {SOAP.SoapMethodCall} soapCall is the SOAP call being performed
     * @param {Campaign.XtkMethodParam[]}  inputParams is the list of input parameters. The first paramater in the array is the "this" parameter for non-static method calls
     * @param {Campaign.XtkMethodParam[]}  outputParams is the list of output parameters. The first paramater in the array is the "this" parameter for non-static method calls
     * @param {string} representation is the representation to use to interpret the parameters 
     */
    async _makeInterceptableSoapCall(entitySchemaId, schema, soapCall, inputParams, outputParams, representation) {
        // Call observers and give them a chance to modify the parameters before the call is actually made
        if (!soapCall.internal) {
            await this._beforeSoapCall({
                urn: soapCall.urn,
                name: soapCall.methodName,
            }, inputParams, representation);
        }

        // Make SOAP call
        await this._writeSoapCallParameters(entitySchemaId, schema, soapCall, inputParams, representation);
        await this._makeSoapCall(soapCall);
        await this._readSoapCallResult(entitySchemaId, schema, soapCall, outputParams, representation);
        
        // Specific handling of query results
        // https://github.com/adobe/acc-js-sdk/issues/3 
        if (entitySchemaId === "xtk:queryDef" && soapCall.methodName === "ExecuteQuery") {
            const returnValue = outputParams[1].value; // first parameter is the "this", second one (index 1) is the query result
            const emptyResult = Object.keys(returnValue).length == 0;
            const object = inputParams[0].value; // first parmater is the "this"
            const operation = EntityAccessor.getAttributeAsString(object, "operation");
            if (operation == "getIfExists" && emptyResult)
                outputParams[1].value = null;
            else if (operation == "select" && emptyResult) {
                const querySchemaId = EntityAccessor.getAttributeAsString(object, "schema");
                const index = querySchemaId.indexOf(':');
                const querySchemaName = querySchemaId.substr(index + 1).replace(':', '_');
                outputParams[1].value[querySchemaName] = [];
            }
        }

        // Call observers and give them a chance to modify the results
        if (!soapCall.internal) {
            await this._afterSoapCall({
                urn: soapCall.urn,
                name: soapCall.methodName
            }, inputParams, representation, outputParams);
        }
    }

    /**
     * After a SOAP method call has been prepared with '_prepareSoapCall', and parameters have been added,
     * this function actually executes the SOAP call
     *
     * @private
     * @param {SOAP.SoapMethodCall} soapCall the SOAP method to call
     */
    _makeSoapCall(soapCall) {
        const that = this;
        if (soapCall.requiresLogon() && !that.isLogged())
            throw CampaignException.NOT_LOGGED_IN(soapCall, `Cannot execute SOAP call ${soapCall.urn}#${soapCall.methodName}: you are not logged in. Use the Logon function first`);
        soapCall.finalize(this._soapEndPoint());

        const safeCallData = Util.trim(soapCall.request.data);
        if (that._traceAPICalls)
            console.log(`SOAP//request ${safeCallData}`);
        that._notifyObservers((observer) => observer.onSOAPCall && observer.onSOAPCall(soapCall, safeCallData) );

        const pushDownOptions = soapCall._pushDownOptions;
        const event = this._trackEvent('SOAP//request', undefined, {
            urn: soapCall.urn,
            methodName: soapCall.methodName,
            internal: soapCall.internal,
            retry: false,
            retryCount: soapCall._retryCount,
            safeCallData: safeCallData,
        }, pushDownOptions);
        return soapCall.execute()
            .then(() => {
                const safeCallResponse = Util.trim(soapCall.response);
                if (that._traceAPICalls)
                    console.log(`SOAP//response ${safeCallResponse}`);
                that._notifyObservers((observer) => observer.onSOAPCallSuccess && observer.onSOAPCallSuccess(soapCall, safeCallResponse) );
                this._trackEvent('SOAP//response', event, { safeCallResponse: safeCallResponse }, pushDownOptions);
                return Promise.resolve();
            })
            .catch((ex) => {
                if (that._traceAPICalls)
                    console.log(`SOAP//failure ${ex.toString()}`);
                that._notifyObservers((observer) => observer.onSOAPCallFailure && observer.onSOAPCallFailure(soapCall, ex) );
                this._trackEvent('SOAP//failure', event, ex, pushDownOptions);
                // Call session expiration callback in case of 401
                if (ex.statusCode == 401 && that._refreshClient && soapCall.retry) {
                    return this._retrySoapCall(soapCall);
                }
                else
                    return Promise.reject(ex);
            });
    }

    _onLogon() {
        this.application = new Application(this);
        this.application._registerCacheChangeListener();
        this._observabilityContext.instance = {
            buildNumber: this.application.buildNumber,
            version: this.application.version,
            instanceName: this.application.instanceName,
        };
        if (this.application.operator) {
            this._observabilityContext.instance.operator = {
                login: this.application.operator.login,
                id: this.application.operator.id,
                timezone: this.application.operator.timezone,
                rights: this.application.operator.rights,
                packages: this.application.operator.packages,
            };
        }
        this._observabilityContext.session = {
            logonAt: Date.now(),
        };
    }

    _onLogoff() {
        delete this._observabilityContext.instance;
        delete this._observabilityContext.session;
    }

    _updateSessionInfo(sessionInfo, soapCall) {
        this._sessionInfo = sessionInfo;
        this._installedPackages = {};
        const userInfo = DomUtil.findElement(sessionInfo, "userInfo");
        if (!userInfo)
            throw CampaignException.UNEXPECTED_SOAP_RESPONSE(soapCall, `userInfo structure missing`);
        let pack = DomUtil.getFirstChildElement(userInfo, "installed-package");
        while (pack) {
            const name = `${DomUtil.getAttributeAsString(pack, "namespace")}:${DomUtil.getAttributeAsString(pack, "name")}`;
            this._installedPackages[name] = name;
            pack = DomUtil.getNextSiblingElement(pack);
        }
    }

    async _fetchSessionInfo() {
        const userInfoPromise = this.NLWS.xml.xtkSession.getUserInfo();
        const testPromise = this.test();
        const all = Promise.all([userInfoPromise, testPromise]);
        const values = await all;

        const sessionInfo = DomUtil.newDocument("sessionInfo");
        const sessionInfoRoot = sessionInfo.documentElement;
        const userInfo = sessionInfo.importNode(values[0], true);
        sessionInfoRoot.appendChild(userInfo);
        const serverInfo = sessionInfo.createElement('serverInfo');
        sessionInfoRoot.appendChild(serverInfo);
        const test = values[1];
        if (test["date"])
            serverInfo.setAttribute("serverDate", new Date(Date.parse(test["date"])).toISOString());
        serverInfo.setAttribute("instanceName", test["instance"]);
        if (test["version"]) {
            const versionParts = test["version"].split(".");
            serverInfo.setAttribute("majNumber", versionParts[0]);
            serverInfo.setAttribute("minNumber", versionParts[1]);
            serverInfo.setAttribute("servicePack", versionParts[2]);
        }
        let buildNumber = test["build"];
        // Alternative method to get the build number (not available unless server has been upgraded at least once)
        if (!buildNumber)
            buildNumber = await this.getOption("NmsServer_LastPostUpgrade", false);
        if (!buildNumber)
            throw CampaignException.UNEXPECTED_SOAP_RESPONSE(undefined, `buildNumber structure missing for both /r/test and NmsServer_LastPostUpgrade option`);
        serverInfo.setAttribute("buildNumber", buildNumber);
        return sessionInfoRoot;
    }

    /**
     * Login to an instance
     */
    logon() {
        const that = this;

        this.application = null;
        this._sessionToken = "";
        this._securityToken = "";
        this._bearerToken = undefined;
        const credentials = this._connectionParameters._credentials;

        const sdkVersion = this.sdk.getSDKVersion();
        const version = `${sdkVersion.name} ${sdkVersion.version}`;
        const clientApp = this._connectionParameters._options.clientApp;
        if (!this._connectionParameters._options.noSDKHeaders) {
            this._connectionParameters._options.extraHttpHeaders["ACC-SDK-Version"] = version;
            this._connectionParameters._options.extraHttpHeaders["ACC-SDK-Auth"] = `${credentials._type}`;
            if (clientApp)
                this._connectionParameters._options.extraHttpHeaders["ACC-SDK-Client-App"] = clientApp;
        }
        // See NEO-35259
        this._connectionParameters._options.extraHttpHeaders['X-Query-Source'] = `${version}${clientApp? "," + clientApp : ""}`;

        this._trackEvent('SDK//logon', undefined, {});

        // Clear session token cookie to ensure we're not inheriting an expired cookie. See NEO-26589
        if (credentials._type != "SecurityToken" && typeof document != "undefined") {
            document.cookie = '__sessiontoken=;path=/;';
        }
        if (credentials._type == "SessionToken" || credentials._type == "AnonymousUser" || credentials._type == "SessionAndSecurityToken") {
            that._sessionInfo = undefined;
            that._installedPackages = {};
            that._sessionToken = credentials._sessionToken;
            that._securityToken = credentials._type == "SessionAndSecurityToken" ? credentials._securityToken : "";
            that._bearerToken = undefined;
            that._onLogon();
            return Promise.resolve();
        }
        else if (credentials._type == "SecurityToken") {
            that._sessionInfo = undefined;
            that._installedPackages = {};
            that._sessionToken = "";
            that._securityToken = credentials._securityToken;
            that._bearerToken = undefined;
            that._onLogon();
            return Promise.resolve();
        }
        else if (credentials._type == "ImsBearerToken") {
            that._sessionInfo = undefined;
            that._installedPackages = {};
            that._sessionToken = "";
            that._securityToken = "";
            that._bearerToken = credentials._bearerToken;

            // With IMS Bearer token, we do not call the Logon or BearerTokenLogon method any more. As a consequence,
            // we do not have the user and server information returned by those methods, so we need to get the corresponding
            // information by other means
            if (!this._connectionParameters._options.sessionInfo) {
                that._onLogon();
                return Promise.resolve();
            }
            return that._fetchSessionInfo().then((sessionInfo) => {
                that._updateSessionInfo(sessionInfo, undefined);
                that._onLogon();
            });
        }
        else if (credentials._type == "UserPassword" || credentials._type == "BearerToken") {
            const soapCall = that._prepareSoapCall("xtk:session", credentials._type === "UserPassword" ? "Logon" : "BearerTokenLogon", true, false, this._connectionParameters._options.extraHttpHeaders);
            // No retry for logon SOAP methods
            soapCall.retry = false;
            if (credentials._type == "UserPassword") {
                const user = credentials._getUser();
                const password = credentials._getPassword();
                if (!this._connectionParameters._options.noSDKHeaders)
                    this._connectionParameters._options.extraHttpHeaders["ACC-SDK-Auth"] = `${credentials._type} ${user}`;
                soapCall.writeString("login", user);
                soapCall.writeString("password", password);
                var parameters = null;
                if (this._connectionParameters._options.rememberMe) {
                    parameters = soapCall.createElement("parameters");
                    parameters.setAttribute("rememberMe", "true");
                }
                soapCall.writeElement("parameters", parameters);
            }
            else {
                const bearerToken = credentials._bearerToken;
                soapCall.writeString("bearerToken", bearerToken);
            }
            return this._makeSoapCall(soapCall).then(function() {
                const sessionToken = soapCall.getNextString();
                const sessionInfo = soapCall.getNextDocument();
                that._updateSessionInfo(sessionInfo, soapCall);
                const securityToken = soapCall.getNextString();
                soapCall.checkNoMoreArgs();
                // Sanity check: we should have both a session token and a security token.
                if (!sessionToken)
                    throw CampaignException.UNEXPECTED_SOAP_RESPONSE(soapCall, `Logon method succeeded, but no session token was returned`);
                if (!securityToken)
                    throw CampaignException.UNEXPECTED_SOAP_RESPONSE(soapCall, `Logon method succeeded, but no security token was returned`);
                // store member variables after all parameters are decode the ensure atomicity
                that._sessionToken = sessionToken;
                that._securityToken = securityToken;
                that._bearerToken = undefined;

                that._onLogon();
            });
        }
        else {
            //throw CampaignException.INVALID_CREDENTIALS_TYPE(credentials._type, "Cannot logon");
            return Promise.reject(CampaignException.INVALID_CREDENTIALS_TYPE(credentials._type, "Cannot logon"));
        }
    }

    /**
     * Get details about the session (assumes client is logged)
     *
     * @param {string} representation the expected representation. If not set, will use the default client representation
     * @returns {Campaign.SessionInfo} details about the session
     */
    getSessionInfo(representation) {
        representation = representation || this._representation;
        return this._toRepresentation(this._sessionInfo, representation);
    }

    /**
     * Logs off from an instance to which one previous logged on using the "logon" call
     */
    logoff() {
        var that = this;
        try {
            if (!that.isLogged()) return;
            that.application._unregisterCacheChangeListener();
            that._unregisterAllCacheChangeListeners();
            this.stopRefreshCaches();
            const credentials = this._connectionParameters._credentials;
            if (credentials._type != "SessionToken" && credentials._type != "AnonymousUser") {
                var soapCall = that._prepareSoapCall("xtk:session", "Logoff", true, false, this._connectionParameters._options.extraHttpHeaders);
                return this._makeSoapCall(soapCall).then(function() {
                    that._sessionToken = "";
                    that._securityToken = "";
                    that._bearerToken = undefined;
                    that.application = null;
                    soapCall.checkNoMoreArgs();
                });
            }
            else {
                that._sessionToken = "";
                that._securityToken = "";
                that._bearerToken = undefined;
                that.application = null;
            }
        } finally {
            this._trackEvent('SDK//logoff', undefined, {});
            this._onLogoff();
        }
    }

    /**
     * Get the value of an option
     *
     * @param {string} name is the option name, for instance XtkDatabaseId
     * @param {boolean} useCache indicates whether to use the cache or not. Default is true
     * @return the option value, casted in the expected data type. If the option does not exist, it will return null.
     */
    async getOption(name, useCache = true) {
      var value;
      if (useCache) {
        value = await this._optionCache.get(name);
      }
      if (value === undefined) {
        const option = await this.NLWS.xtkSession.getOption(name);
        value = await this._optionCache.put(name, option);
      }
      return value;
    }

    /**
     * Set an option value. Creates the option if it does not exists. Update the option
     * if it exists already
     *
     * @param {string} name the option name
     * @param {*} rawValue the value to set
     * @param {string} description the optional description of the option
     */
    async setOption(name, rawValue, description) {
        // First, read the current option value to make sure we have the right type
        await this.getOption(name, true);
        const option = await this._optionCache.getOption(name);
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
        await this.NLWS.xtkSession.write(doc);
        // Once set, cache the value
        await this._optionCache.put(name, [value, type]);
    }

    /**
     * Clears the options cache
     */
    async clearOptionCache() {
        await this._optionCache.clear();
    }

    /**
     * Clears the method cache
     */
    async clearMethodCache() {
        await this._methodCache.clear();
    }

    /**
     * Clears the entity cache
     */
    async clearEntityCache() {
        await this._entityCache.clear();
    }

    /**
     * Clears all caches (options, methods, entities)
     */
    async clearAllCaches() {
        return Promise.all([
            this.clearEntityCache(),
            this.clearMethodCache(),
            this.clearOptionCache(),
        ]);
    }

    /**
     * Start auto refresh of all caches
     * @param {integer} refreshFrequency refresh frequency in ms. 10000 ms by default.
     */
    startRefreshCaches(refreshFrequency) {
        if (refreshFrequency === undefined || refreshFrequency === null)
            refreshFrequency = 10000;
        this._optionCacheRefresher.startAutoRefresh(refreshFrequency);
        // Start auto refresh for entityCache a little later
        setTimeout(() => { this._entityCacheRefresher.startAutoRefresh(refreshFrequency); }, refreshFrequency/2);
    }
    /**
     * Stop auto refresh of all caches
     */
    stopRefreshCaches() {
        this._optionCacheRefresher.stopAutoRefresh();
        this._entityCacheRefresher.stopAutoRefresh();
    }

    // Register a callback to be called when a schema has been modified and should be removed
    // from the caches
    _registerCacheChangeListener(listener) {
        this._cacheChangeListeners.push(listener);
    }

    // Unregister a cache change listener
    _unregisterCacheChangeListener(listener) {
        for (var i = 0; i < this._cacheChangeListeners.length; i++) {
            if (this._cacheChangeListeners[i] == listener) {
                this._cacheChangeListeners.splice(i, 1);
                break;
            }
        }
    }

    // Unregister all cache change listener
    _unregisterAllCacheChangeListeners() {
        this._cacheChangeListeners = [];
    }

    _notifyCacheChangeListeners(schemaId) {
        this._cacheChangeListeners.map((listener) => listener.invalidateCacheItem(schemaId));
    }

    /**
     * Tests if a package is installed
     *
     * @param {string} packageId the package identifier, for instance: "nms:amp"
     * @param {string} optionalName if set, the first parameter will be interpreted as the namespace (ex: "nms") and the second as the name, ex: "amp"
     * @returns {boolean} a boolean indicating if the package is installed or not
     */
    hasPackage(packageId, optionalName) {
    if (optionalName !== undefined)
        packageId = `${packageId}:${optionalName}`;
    if (!this.isLogged())
        throw CampaignException.NOT_LOGGED_IN(undefined, `Cannot call hasPackage: session not connected`);
    return this._installedPackages[packageId] !== undefined;
    }

    /**
     * Obtains a cipher that can be used to encrypt/decrypt passwords, using the database secret key.
     * This is used for example for mid-sourcing account.
     *
     * @private
     * @deprecated since version 1.0.0
     */
    async _getSecretKeyCipher() {
        var that = this;
        if (this._secretKeyCipher) return this._secretKeyCipher;
        return that.getOption("XtkSecretKey").then(function(secretKey) {
            that._secretKeyCipher = new Cipher(secretKey);
            return that._secretKeyCipher;
        });
    }

    /**
     * Gets an entity, such as a schema, a source schema, a form, a navtree, etc. Each Campaign entity has a MD5 which is used to determine
     * if an entity has changed or not. The GetEntityIfMoreRecent SOAP call can use this MD5 to avoid returning entities that did not
     * actually changed. Currently, the SDK, however is not able to use the MD5 and will perform a SOAP call every time the function is
     * called and return the whole entity
     *
     * @param {string} entityType is the type of entity requested, such as "xtk:schema", "xtk:srcSchema", "xtk:navtree", "xtk:form", etc.
     * @param {string} fullName is the fully qualified name of the entity (i.e. <namespace>:<name>)
     * @param {string} representation the expected representation, or undefined to set the default
     * @param {boolean} internal indicates an "internal" call, i.e. a call performed by the SDK itself rather than the user of the SDK. For instance, the SDK will dynamically load schemas to find method definitions
     * @return {XML.XtkObject} A DOM or JSON representation of the entity, or null if the entity is not found
     */
    async getEntityIfMoreRecent(entityType, fullName, representation, internal) {
        const soapCall = this._prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent", true, internal, this._connectionParameters._options.extraHttpHeaders);
        const inputParams = [
            { name: "pk", type: "string", value: entityType + "|" + fullName },
            { name: "md5", type: "string", value: "" },
            { name: "mustExist", type: "boolean", value: false },
        ];
        const outputParams = [
            { name: "doc", type: "DOMDocument" },
        ];
        await this._makeInterceptableSoapCall("xtk:session", undefined, soapCall, inputParams, outputParams, representation);
        return outputParams[0].value;
    }

    /**
     * Creates a schema object from an XML representation.
     * The returned XtkSchema object will not be added to the application schema cache.
     * If you do not pass an application object, it will not be possible to follow
     * references or get enumeration values from the returned XtkSchema
     * 
     * @param {DOMElement|DOMDocument} xml the XML document or element representing the schema
     * @returns {Campaign.XtkSchema} a schema object
     * @see {@link Campaign.XtkSchema}
     */
    newSchema(xml) {
        return newSchema(xml, this.application);
    }

    /**
     * Get a compiled schema (not a source schema) definition as a DOM or JSON object depending on hte current representation
     *
     * @param {string} schemaId the schema id, such as "xtk:session", or "nms:recipient"
     * @param {string} representation an optional representation of the schema: "BadgerFish", "SimpleJson" or "xml". If not set, we'll use the client default representation
     * @param {boolean} internal indicates an "internal" call, i.e. a call performed by the SDK itself rather than the user of the SDK. For instance, the SDK will dynamically load schemas to find method definitions
     * @returns {XML.XtkObject}  the schema definition, as either a DOM document or a JSON object
     */
    async getSchema(schemaId, representation, internal) {
        var entity = await this._entityCache.get("xtk:schema", schemaId);
        if (!entity) {
              // special case of "temp:group:*" schemas for nms:group
              // Schema "temp:group:*" is not cached because life cycle of this kind of schema is not the same as the others schemas
              if (schemaId.startsWith("temp:group:")) {
                  const parts = schemaId.split(":");
                  let queryDef = {
                    "schema": "nms:group",
                    "operation": "get",
                    "select": {
                      "node": [
                        { "expr": "@id" },
                        { "expr": "extension" }
                      ]
                    },
                    "where": {
                      "condition": [
                        { "expr": "@id=" + XtkCaster.asLong(parts[2]) }
                      ]
                    }
                  };
                  // Convert to current representation
                  queryDef = this._convertToRepresentation(queryDef, "SimpleJson", "xml");
                  const query = this.NLWS.xml.xtkQueryDef.create(queryDef);
                  try {
                      const groupSchema = await query.executeQuery();
                      const extension = DomUtil.findElement(groupSchema, "extension");
                      if (extension) {
                          entity = extension;
                      } else {
                          entity = null;
                      }
                  } catch (ex) {
                      if (ex.name == 'CampaignException' && ex.errorCode == 'SOP-330011') {
                          entity = null;
                      } else {
                          throw ex;
                      }
                  }
              } else {
                  entity = await this.getEntityIfMoreRecent("xtk:schema", schemaId, "xml", internal);
                  if (entity) {
                      const impls = DomUtil.getAttributeAsString(entity, "implements");
                      if (impls === "xtk:persist" && schemaId !== "xtk:session" && schemaId !== "xtk:persist") {
                          // Ensure xtk:persist is present by loading the xtk:session schema
                          const xtkSession = await this.getSchema("xtk:session", "xml", true);
                          // it is possible that methodCache content has not be loaded in memory
                          // so we re-put the methods 
                          await this._methodCache.put(xtkSession);
                      }
                      await this._entityCache.put("xtk:schema", schemaId, entity);
                      await this._methodCache.put(entity);
                  }
            }
        }
        entity = this._toRepresentation(entity, representation);
        return entity;
    }

    /**
     * Get the definition of a system enumeration (SysEnum). Will be returned as JSON or XML depending on the client 'representation' attribute
     *
     * @param {string} enumName
     * @param {string} optionalStartSchemaOrSchemaName
     * @returns {XML.XtkObject} the enumeration definition in the current representation
     */
    async getSysEnum(enumName, optionalStartSchemaOrSchemaName) {

        // Called with one parameter: enumName must be the fully qualified enumeration name
        // as <namespace>:<schema>:<enum>, for instance "nms:extAccount:encryptionType"
        if (!optionalStartSchemaOrSchemaName) {
            const index = enumName.lastIndexOf(':');
            if (index == -1)
                throw CampaignException.BAD_PARAMETER("enumName", enumName, `getEnum expects a fully qualified enumeration name. '${enumName}' is not a valid name.`);
            optionalStartSchemaOrSchemaName = enumName.substring(0, index);
            enumName = enumName.substring(index + 1);
        }

        if (!optionalStartSchemaOrSchemaName || optionalStartSchemaOrSchemaName == "")
            throw CampaignException.BAD_PARAMETER("enumName", enumName, `getEnum needs a schema id.`);

        // If we have a schema name (and not a schema), then lookup the schema by name
        if (typeof optionalStartSchemaOrSchemaName == "string") {
            const index = optionalStartSchemaOrSchemaName.lastIndexOf(':');
            if (index == -1)
                throw CampaignException.BAD_PARAMETER("optionalStartSchemaOrSchemaName", optionalStartSchemaOrSchemaName, `getEnum expects a valid schema name. '${optionalStartSchemaOrSchemaName}' is not a valid name.`);
            optionalStartSchemaOrSchemaName = await this.getSchema(optionalStartSchemaOrSchemaName, undefined, true);
            if (!optionalStartSchemaOrSchemaName)
                throw CampaignException.BAD_PARAMETER("optionalStartSchemaOrSchemaName", optionalStartSchemaOrSchemaName, `Schema '${optionalStartSchemaOrSchemaName}' not found.`);
        }
        else
            throw CampaignException.BAD_PARAMETER("optionalStartSchemaOrSchemaName", optionalStartSchemaOrSchemaName, `getEnum expects a valid schema name wich is a string. Given ${typeof optionalStartSchemaOrSchemaName} instead`);

        const schema = optionalStartSchemaOrSchemaName;
        for (const e of EntityAccessor.getChildElements(schema, "enumeration")) {
            const n = EntityAccessor.getAttributeAsString(e, "name");
            if (n == enumName)
                return e;
        }
    }

    /**
     * Call Campaign SOAP method
     *
     * @private
     * @param {string} methodName is the method to call. In order to be more JavaScript friendly, the first char can be lower-cased
     * @param {*} callContext the call context)
     * @param {*} parameters is an array of function parameters. When there's only one parameter, it can be passed directly
     * @returns {*} the SOAP call result. If there's just one output parameter, the value itself will be returned. If not, an array will be returned
     */
    async _callMethod(methodName, callContext, parameters) {
        const that = this;
        const schemaId = callContext.schemaId;

        var entitySchemaId = schemaId;
        if (schemaId === 'xtk:jobInterface')
            entitySchemaId = callContext.entitySchemaId;

        // Get the schema which contains the method call. Methods of the xtk:jobInterface interface are handled specificaaly
        // because xtk:jobInterface is not actually a schema, but just an interface. In practice, it's used as an xtk template
        // rather that an xtk inheritance mechanism
        const methodSchemaId = schemaId === 'xtk:jobInterface' ? 'xtk:job' : schemaId;
        var schema = await that.getSchema(methodSchemaId, "xml", true);
        if (!schema)
            throw CampaignException.SOAP_UNKNOWN_METHOD(schemaId, methodName, `Schema '${schemaId}' not found`);

        // Lookup the method to call
        var method = await that._methodCache.get(methodSchemaId, methodName);
        if (!method) {
            // first char of the method name may be lower case (ex: nms:seedMember.getAsModel) but the methodName 
            // variable has been capitalized. Make an attempt to lookup method name without capitalisation
            const methodNameLC = methodName.substring(0, 1).toLowerCase() + methodName.substring(1);
            method = await that._methodCache.get(schemaId, methodNameLC);
            if (method) methodName = methodNameLC;
        }
        if (!method) {
            await this._methodCache.put(schema);
            method = await that._methodCache.get(methodSchemaId, methodName);
        }
        if (!method)
            throw CampaignException.SOAP_UNKNOWN_METHOD(schemaId, methodName, `Method '${methodName}' of schema '${schemaId}' not found`);

        // Compute the SOAP URN. Again, specically handle xtk:jobInterface as it's not a real schema. The actual entity schema
        // would be available as the entitySchemaId property of the callContext
        var urn = schemaId !== 'xtk:jobInterface' ? await that._methodCache.getSoapUrn(schemaId, methodName)
            : `xtk:jobInterface|${entitySchemaId}`;

        const isStatic = DomUtil.getAttributeAsBoolean(method, "static");
        var soapCall = that._prepareSoapCall(urn, methodName, isStatic, false, callContext.headers, callContext.pushDownOptions);

        // If method is called with one parameter which is a function, then we assume it's a hook: the function will return
        // the actual list of parameters
        let isfunc = parameters && typeof parameters === "function";
        if (!isfunc && parameters && parameters.length >= 1 && typeof parameters[0] === "function")
            isfunc = true;
        if (isfunc)
            parameters = parameters[0](method, callContext);

        // Create input and output parameters arrays. Each array will contain elements for the corresponding parameter name, type and value
        const inputParams = [];
        const outputParams = [];

        // For non static methods 
        //   in case of persistent job: object represents the entity instance
        //   in case of non-persistent job: object represents job description 
        // the first output parameters represent the entity itself. The name of the corresponding
        // parameter is set the the entity schema name.
        if (!isStatic) {
            var schemaName = entitySchemaId.substring(entitySchemaId.indexOf(':') + 1);
            if (!callContext.object)
                throw CampaignException.SOAP_UNKNOWN_METHOD(schemaId, methodName, `Cannot call non-static method '${methodName}' of schema '${schemaId}' : no object was specified`);
            inputParams.push({
                name: schemaName,
                type: "DOMDocument",
                value: callContext.object
            });
            outputParams.push({
                name: schemaName,
                type: "DOMDocument"
            });
        }

        // Traverse the <parameters> object and create the corresponding parameter objects
        const parametersIsArray = (typeof parameters == "object") && parameters.length;
        const params = DomUtil.getFirstChildElement(method, "parameters");
        if (params) {
            var param = DomUtil.getFirstChildElement(params, "param");
            var paramIndex = 0;
            while (param) {
                const inout = DomUtil.getAttributeAsString(param, "inout");
                const type = DomUtil.getAttributeAsString(param, "type");
                const paramName = DomUtil.getAttributeAsString(param, "name");
                const isIn = !inout || inout=="in" || inout=="inout";
                const isOut = inout=="out" || inout=="inout";
                if (isIn) {
                    let paramValue = parametersIsArray ? parameters[paramIndex] : parameters;
                    const inputParam = {
                        name: paramName,
                        type: type,
                        value: paramValue
                    };
                    inputParams.push(inputParam);
                    paramIndex = paramIndex + 1;
                }
                if (isOut) {
                    outputParams.push({
                        name: paramName,
                        type: type,
                    });
                }
                if( !isIn && !isOut) {
                    throw CampaignException.BAD_PARAMETER("inout", inout, `Parameter '${paramName}' of schema '${entitySchemaId}' is not correctly defined as an input or output parameter`);
                }
                param = DomUtil.getNextSiblingElement(param, "param");
            }
        }

        // Make the SOAP call
        await this._makeInterceptableSoapCall(entitySchemaId, schema, soapCall, inputParams, outputParams, callContext.representation);
        
        // Simplify the result when there's 0 or 1 return value
        if (!isStatic) {
            const newObject = outputParams.shift().value;
            if (newObject) callContext.object = newObject;
        }
        if (outputParams.length == 0) return null;
        if (outputParams.length == 1) return outputParams[0].value;
        const result = [];
        for (var i=0; i<outputParams.length; i++) {
            result.push(outputParams[i].value);
        }
        return result;
    }

    /**
     * Public API to dynamically invoke SOAP calls. This API allows to call any SOAP calls, including anonyous
     * SOAP calls such as xtk:session#GetServerTime
     * 
     * @param {string} urn is the schema id, such as "xtk:session"
     * @param {string} methodName is the name of the method to call, for example "GetServerTime"
     * @param {boolean} isStatic indicates if the method is static or not
     * @param {array} inputParams is an array of input parameters. Each element of the array is an object with the following properties: name, type, value
     * @param {array} outputParams is an array of output parameters. Each element of the array is an object with the following properties: name, type
     * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
     * 
     * @returns {array} the method return values in the same order as was described in the outputParams array.
     * In addition, the outputParams array will be modified, and the "value" property of each output param will be set
     */
    async makeSoapCall(urn, methodName, isStatic, inputParams, outputParams, representation) {
        const soapCall = this._prepareSoapCall(urn, methodName, isStatic, false, 
          this._connectionParameters._options.extraHttpHeaders);
        // To support anonymous SOAP calls, we need to disable the logon check
        soapCall.requiresLogon = () => false;
        await this._makeInterceptableSoapCall(urn, null, soapCall, inputParams, outputParams, representation);
        const results = outputParams.map((o)=> o.value);
        return results;
    }

    async _makeHttpCall(request) {
        request.method = request.method || "GET";
        request.headers = request.headers || [];
        if (!request.headers['User-Agent'])
            request.headers['User-Agent'] = this._getUserAgentString();
        let event;
        try {
            const safeCallData = Util.trim(request.data);
            if (this._traceAPICalls)
                console.log(`HTTP//request ${request.method} ${request.url}${safeCallData ? " " + safeCallData : ""}`);
            this._notifyObservers((observer) => observer.onHTTPCall && observer.onHTTPCall(request, safeCallData) );
            event = this._trackEvent('HTTP//request', undefined, {
                url: request.url,
                method: request.method,
                headers: request.request,
                safeCallData: safeCallData,
            });
            const body = await this._transport(request);

            const safeCallResponse = Util.trim(body);
            if (this._traceAPICalls)
                console.log(`HTTP//response${safeCallResponse ? " " + safeCallResponse : ""}`);
            this._notifyObservers((observer) => observer.onHTTPCallSuccess && observer.onHTTPCallSuccess(request, safeCallResponse) );
            this._trackEvent('HTTP//response', event, { safeCallResponse: safeCallResponse });
            return body;
        } catch(err) {
            if (this._traceAPICalls)
                console.log("HTTP//failure", err);
            this._notifyObservers((observer) => observer.onHTTPCallFailure && observer.onHTTPCallFailure(request, err) );
            const ex = makeCampaignException({ request:request, response:err.response }, err);
            this._trackEvent('HTTP//failure', event, { }, ex);
            throw ex;
        }
    }

    /**
     * Tests if the Campaign redirection server is up (/r/test).
     * Does not require a logged client
     *
     * @returns {Campaign.RedirStatus} an object describing the status of the redirection server
     */
    async test() {
        const request = {
            url: `${this._connectionParameters._endpoint}/r/test`,
            headers: {}
        };
        for (let h in this._connectionParameters._options.extraHttpHeaders)
            request.headers[h] = this._connectionParameters._options.extraHttpHeaders[h];
        const body = await this._makeHttpCall(request);
        const xml = DomUtil.parse(body);
        const result = this._toRepresentation(xml);
        return result;
    }

    /**
     * Ping the Campaign server (/nl/jsp/ping.jsp)
     *
     * @returns {Campaign.PingStatus} an object describing the server status
     */
    async ping() {
        const headers = this._getAuthHeaders(true);
        const request = {
            url: `${this._connectionParameters._endpoint}/nl/jsp/ping.jsp`,
            headers: headers,
        };
        for (let h in this._connectionParameters._options.extraHttpHeaders)
            request.headers[h] = this._connectionParameters._options.extraHttpHeaders[h];
        const body = await this._makeHttpCall(request);
        const lines = body.split('\n');
        const doc = DomUtil.newDocument("ping");
        const root = doc.documentElement;
        const status = lines[0].trim();
        if (status != "") root.setAttribute("status", status);

        if (lines.length > 1) {
            const timestamp = lines[1].trim();
            if (timestamp != "") root.setAttribute("timestamp", timestamp);
        }
        const result = this._toRepresentation(doc);
        return result;
    }

    /**
     * This is the exposed/public method to request context data for a specific report.
     * @param {*} callContext: {reportName: string, schema: string, context: string, selection: string, formData: any}
     * @param {string} representation the expected representation ('xml', 'BadgerFish', or 'SimpleJson'). If not set, will use the current representation
     *
     * @returns {Campaign.ReportContext} an object containing the context data for a specific report
     */
    async getReportData(callContext, representation) {
        try {
            if(callContext.formData && callContext.formData.ctx) {
                var xmlCtx = this._fromRepresentation('ctx', callContext.formData.ctx);
                callContext.formData.ctx = DomUtil.toXMLString(xmlCtx);
            }
            const selectionCount = callContext.selection.split(',').length;
            
            const headers = this._getAuthHeaders(false);
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const request = {
                url: `${this._connectionParameters._endpoint}/report/${callContext.reportName}?${encodeURI(`_noRender=true&_schema=${callContext.schema}&_context=${callContext.context}&_selection=${callContext.selection}`)}&_selectionCount=${selectionCount}`,
                headers: headers,
                method: 'POST',
                data : qsStringify(callContext.formData)
            };
            
            for (let h in this._connectionParameters._options.extraHttpHeaders)
                request.headers[h] = this._connectionParameters._options.extraHttpHeaders[h];
            const body = await this._makeHttpCall(request);
            if(!body.startsWith("<ctx"))
                throw CampaignException.FEATURE_NOT_SUPPORTED("Reports Data");
            const xml = DomUtil.parse(body);
            const result = this._toRepresentation(xml, representation);
            return result;
        } catch(ex) {
            throw CampaignException.REPORT_FETCH_FAILED(callContext.reportName, ex);
        }
    }

    /**
     * Ping a Message Center Campaign server (/nl/jsp/mcPing.jsp).
     * Assumes Message Center is installed
     *
     * @returns {Campaign.McPingStatus} an object describing Message Center server status
     */
    async mcPing() {
        const headers = this._getAuthHeaders(true);
        const request = {
            url: `${this._connectionParameters._endpoint}/nl/jsp/mcPing.jsp`,
            headers: headers
        };
        for (let h in this._connectionParameters._options.extraHttpHeaders)
            request.headers[h] = this._connectionParameters._options.extraHttpHeaders[h];
        const body = await this._makeHttpCall(request);
        const lines = body.split('\n');
        const doc = DomUtil.newDocument("ping");
        const root = doc.documentElement;
        var status = lines[0].trim();
        if (status != "") root.setAttribute("status", status);

        var rtCount;
        var threshold;
        if (status == "Error") {
            const error = lines.length > 1 ? lines[1] : "";
            root.setAttribute("error", error);
            const index1 = error.indexOf('(');
            const index2 = error.indexOf('/');
            const index3 = error.indexOf(')');
            if (index1 != -1 && index2 != -1 && index3 != -1) {
                rtCount = error.substring(index1+1, index2);
                threshold = error.substring(index2+1, index3);
            }
        }
        else {
            if (lines.length > 1) {
                const timestamp = lines[1].trim();
                if (timestamp != "") root.setAttribute("timestamp", timestamp);
            }
            if (lines.length > 2) {
                const queue = lines[2];
                const index2 = queue.indexOf('/');
                const index3 = queue.indexOf(' pending events');
                if (index2 != -1 && index3 != -1) {
                    rtCount = queue.substring(0, index2);
                    threshold = queue.substring(index2+1, index3);
                }
            }
        }
        if (rtCount !== undefined && rtCount.trim() != "") root.setAttribute("eventQueueSize", rtCount);
        if (threshold !== undefined && rtCount.trim() != "") root.setAttribute("eventQueueMaxSize", threshold);
        const result = this._toRepresentation(doc);
        return result;
    }

    /**
     * Creates a Job object which can be used to submit jobs, retrieve status, logs and progress, etc.
     * @param {Campaign.XtkSoapCallSpec} soapCallSpec the definition of the SOAP call
     * @returns {Campaign.XtkJobInterface} a job
     */
    jobInterface(soapCallSpec) {
        return new XtkJobInterface(this, soapCallSpec);
    }

    // Calls the beforeSoapCall method on all observers which have this method. Ignore any exception
    // that may occur in the callbacks. This function does not return anything but may modify the object
    // or parameters before the SOAP call is performed
    // @param {*} method is an object decribing the method
    // @param {Array<*>} inputParameters is an array containing the method parameters
    // @param {string} representation is the representation (SimpleJson, xml, etc.) used for this method and in which the object and parameters are set
    async _beforeSoapCall(method, inputParameters, representation) {
        if (!representation) representation = this._representation;
        for (const observer of this._observers) {
            if (observer.beforeSoapCall) {
                try {
                    await observer.beforeSoapCall(method, inputParameters, representation);
                }
                catch (any) {
                    // Ignore errors occuring in observers
                }
            }
        }
    }

    // Calls the afterSoapCall method on all observers which have this method. Ignore any exception
    // that may occur in the callbacks. This function does not return anything but may modify the return
    // value of a SOAP call bedore it is returned to the called
    // @param {*} method is an object decribing the method
    // @param {Array<*>} inputParameters is an array containing the method parameters
    // @param {string} representation is the representation (SimpleJson, xml, etc.) used for this method and in which the object and parameters are set
    // @param {Array<*>} outputParameters an array (possibly) empty of the values returned by the SOAP call
    async _afterSoapCall(method, inputParameters, representation, outputParameters) {
        if (!representation) representation = this._representation;
        for (const observer of this._observers) {
            if (observer.afterSoapCall) {
                try {
                    await observer.afterSoapCall(method, inputParameters, representation, outputParameters);
                }
                catch (any) {
                    // Ignore errors occuring in observers
                }
            }
        }
    }
}


// Public exports
Client.CampaignException = CampaignException;
exports.Client = Client;
exports.Credentials = Credentials;
exports.ConnectionParameters = ConnectionParameters;

})();
