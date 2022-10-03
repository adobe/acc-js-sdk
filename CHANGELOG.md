# Adobe Campaign Classic (ACC) SDK in JavaScript (node.js and browser)

This is a node.js SDK for Campaign API. It exposes the Campaign API exactly like it is used inside Campaign using the NLWS notation.


# Changelog 

## Version 1.1.8
_2022_09_26_

* added translation ids (`labelLocalizationId`,`descriptionLocalizationId`, `labelSingularLocalizationId`) for `XtkSchema`, `XtkSchemaNode`, `XtkEnumerationValue` and `XtkEnumeration`

## Version 1.1.7
_2022_08_30_

* New listener interface to be notified of internal events from the SDK. Can be used to integrate with observability frameworks. See the "Observers" section of the README file.
* Experimental file upload feature. Will require server-side changes to work, and is currently limited to be used with browsers only.

## Version 1.1.6
_2022_08_19_

* New auto-refresh mechanism to keep schemas and option caches up-to-date. See `client.startRefreshCaches` and `client.stopRefreshCaches` functions.

## Version 1.1.5
_2022/07/07__

* The SOAP method name was not showing up properly in the Chrome console

## Version 1.1.4
_2022/07/07__

* Added `application.version` which returns the server version in the format major.minor.servicePack (ex: 8.2.10)
* Added the ability to push down parameters to the SOAP and transport layers. See the pushDown section of the readme file.
* The pushDown mechanism can be used to simply overwrite the request timeout, either globally or at the method level
* Publicly export the HttpError class so that custom transports can be written more safely. A failure during transport should return an HttpError object
* By default, the SOAP method name is now added in the URLs for better troubleshooting

## Version 1.1.3
_2022/05/30_

* Fix a bug in client.hasPackage which was returning an incorrect result when passed a single parameter (it would always return false). Fixed the corresponding unit test too.
* Fix a bug causing API calls having a input parameter of type "int" to fail. Usually the type is described as "long", but sometimes "int" is used instead, such as, for instance, in the nms:extAccount#UpdateMCSynchWkf method.
* When using XML representations and DOMDocument method parameter type, the SDK expects to be passed an actual DOM document. Now it supports being passed a DOM element too. This is a common case when using the nms:delivery#createFromModel API followed by a xtk:session#Write API call.
* Avoid the error 'Cannot transform entity to xml because no XML root name was given' by using SOAP method parameter name as the default for XML document root when no other root is available
* Document how to set the password of an external account
* By default, SDK will send additional HTTP headers to help troubleshooting and usage tracking
* Add the ability to pass extra HTTP headers to API calls, either globally (to all HTTP headers), or locally, i.e. for a specific method
* Remove .vscode folder from the sources
* Example for xtkBuilder.installPackage API
* For APIs which have parameters of type DOMElement and which are called using XML, support passing either a DOMElement or a DOMDocument


## Version 1.1.2
_2022/03/22_

* Add support for choosing the representation (XML or JSON) at the method level using NLWS.xml or NLWS.json.

## Version 1.1.1
_2022/03/10_

* Fixed an issue with encoding: make the default charset encoding to be UTF-8 (https://github.com/adobe/acc-js-sdk/issues/26)

## Version 1.1.0
_2022/03/05_

Changes in the metadata api (`application.getSchema`) which was not completely implemented. While this API is meant to be largely compatible with the [ACC JS API](https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Application.html), it's not always possible to do so because of the asynchronous nature of the SDK. The JS API is executed inside the Campaign application server can will synchronously and transparently fetch schemas as needed. Howerer the SDK runs outside of the Campaign server. It will synchronously and transparently fetch schemas as needed, but this will be done adynchronously. 

Differences are document in the `Application` section of the README.

* Provide array and map access to XtkSchemaKey.fields, 
* The order of children of a node has been changed. Beore 1.1.0, it was attributes, then elements. After 1.1.0, it's the order defined in the schema XML
* New application.getEnumeration function to retreive an enumeration
* Removed the XtkSchemaNode.hasChild function
* Support for ref nodes and links: XtkSchemaNode.refTarget(), XtkSchemaNode.linkTarget() functions
* Reviews XtkSchemaNode.findNode() function to support links, refs, ANY type, etc. and is now asynchronous
* The name attribute of enumerations (`XtkEnumeration.name`) is now the fully qualified name of the enumeration, i.e. is prefixed by the schema id

## Version 1.0.9
_2022/03/02_

* Ability to invoke SOAP calls dynamically with parameters computed at invocation time by a delegate function
* Fixed bug in XPath constructor which now supports expanded paths, i.e. xpaths such as `[@recipient-id]`.
* EntityAccessor: change the heuristic to detect XML types: use "nodeType" and "tagName" functions instead of "insertAdjacentElement" (which was not always working in the context of a React application)
* Add new escaping functions: `escapeForLike`, `expandXPath`, `unexpandXPath`, `xtkConstText`
* New XtkCaster methods: `asDatetime` (alias to `asTimestamp`), `isStringType`, and `isNumericType`
* Metadata API (application.getSchema)
  * keys have a `isInternal` internal attribute which was mistakenly using the "string" type. It's now correctly using the boolean type.
  * Added missing attributes on the XtkSchema: md5
  * Added missing attributes on the XtkSchemaNode objects: dataPolicy, editType folderModel, enumerationImage, size, userEnumeration, hasUserEnumeration, isCollection, 
    isAdvanced, isAnyType, isLink, hasEnumeration, hasSQLTable, SQLName, SQLTable, isMappedAsXML, isTemporaryTable, isElementOnly, isDefaultOnDuplicate, isExternalJoin, 
    isMemo, isMemoData, isBlob, isCDATA, isNotNull, isRequired, isSQL, PKSequence, revLink, isCalculated, expr, isAutoIncrement, isAutoPK,  isAutoUUID, isAutoStg, packageStatusString, and packageStatus
  * Attribute type defaults to string if not set
  * Removed userDescription attribut from schema nodes (only available at the schema level)
  * Changed the toString function to use 4 spaces instead of 3 for indentation and display node label and internal name
  * When label or description is missing from schema nodes or from enumerations, they default to the name value
  * application.getSchema now uses a in-memory cache

For breaking changes see the [migration guide](MIGRATION.md)


## Version 1.0.7
_2022/01/24_
* Added a hook `refreshClient` on connection parameters. This is a callback called when an authentication token expires. It can be used to implement reconnection logic
* New attributes on the schema API (application.getSchema)
  * The `enum` attribute of a schema node returns the corresponding enum attribute, i.e. the enumeration name
  * The `target` attribute of a schema node (of type link) returns the target (schema id) of the link
  * The `integrity` attribute of a schema node (of type link) returns the link integrity ("define", "own", etc.)
* Added a github workflow for code analysis (CodeQL) to detect more potential issues before release
* Upgrade dependencies to fix some vulnerabilities
* Add new conversion functions in XtkCaster to support for int, timespan, uuid, html and blob

## Version 1.0.6
_2021/11/03_
* New ofBearerToken authentication for IMS access token
* Fix a small issue in the compile script which did not create the dist folder if it was missing
* Fix an intermittent bug when running the SDK in the browser and when using local storage cache. The schema cache and method cache 
  should contain XML representation of Campaign schemas and methods. Before it is put in local storage, data needs to be serialized
  as text. This was only working of JavaScript objects, but DOM elements were not being serialied causing various errors when
  using the cache later

## Version 1.0.5
_2021/10/09_
* Fix an issue in the logon() function which was not always returning a promise. Some authentication methods such as SessionToken we returning synchronously. Made it so that logon always returns a promise. This should not be a breaking change as logon does not actually return a value
* Refactor caches (Options cache, Schemas cache, and Methods cache) to use a generic cache class
* Make sure options parameter of ConnectionParameters constructor is not modified
* Added a persistent cache for schemas, methods, and options using the browser localStorage by default
* Make sure X-Security-Token header is hidden as well as session token cookies
* Added jshint configuration and fixed warnings reported by jshint
* Fixed vulnerability in ansi-regex; upgrade jest-junit to version 13 to fix
* Small jsdoc improvements

## Version 1.0.4
_2021/10/07_
* Fix a bug which caused XML text and cdata elements to be skipped during SimpleJson transformation
* Make sure passwords are not logged (replace with "***") when activating traces

## Version 1.0.3
_2021/10/06_
* Added the `sdk.ip()` function to retreive the ouptbound IP to be whitelisted to access Campaign
* New `ofSecurityToken` authentication method for the client-side SDK, which can be used to log on with a security token only. The session token will be passed automatically by the browser.

## Version 1.0.2
_2021/09/17_
* Dummy version to fix NPM build. Need to have the version in both package.json and a commit message to be "Release x.y.z" in master

## Version 1.0.1
_2021/09/16_
* Dummy version to fix NPM build

## Version 1.0.0
_2021/09/16_
* Support for a simpler flavor of JSON (see SimpleJson vs. BadgerFish) which is now the default
* New `EntityAccessor` object to access entity properties regardless of their representation
* Finalize the implementation to support int64
* Add 100% coverage for all tests
* Make some members of the Client object private to clarify what is the public API
* Fixed bug in JSON serialization for XML elments having an attribute named "length" (see `isArray` utility)
* New `application` object to mimic the public SDK (can be accessed via `client.application`)
* New schema API (`application.getSchema`) to easily navigate schemas
* New Campaign enumeration constants (`campaign.js`) for better readability of code using numerical enumeration values
* BadgerFish objects now have a `__representation = "BadgerFish"` attribute to easily distinguish between BadgerFish & SimpleJson
* Logon will fail if server returns a payload which does not contain a `userInfo` object
* New `setOption` function which allows to set (and cache) an option value
* Deprecated the `getSecretKeyCipher` function which may fail on instances where Vault is setup. Use `ConnectionParameters.ofExternalAccount` instead
* `getEntityIfMoreRecent` now takes an additional parameter which allows to specify and force a representation (xml, json...)
* New helper function `DomUtil.isArray` to test if a JavaScript object is an array
* New `EntityAccessor` object which allows to get attributes and child elements from xml or json objects, regardless of their representation
* New `escapeXtk` function to escape litteral values in Xtk expression. Can be used as a function or as a tagged template litteral
* New function `XtkCaster._variantStorageAttribute` which returns the name of a schema attribute used to store variant value types. The name of the attribute depends on the type: stringValue, longValue, etc.
* Support for non static method that mutate the object on which they apply. For instance, the xtk:queryDef#SelectAll
* Added samples in the samples/ folder
* Support of logon with session token only with sdk.ConnectionParameters.ofSessionToken
* Error management. Return a proper CampaignException upon failure with attributes that can be used to retreive error details (both http and soap)
* Message Center API and examples
* Added support for anonymous authentication via the "ofAnonymousUser" credentials function
* Implement SDK functions for /r/test, /nl/jsp/ping.jsp, nl/jsp/mcPing.jsp (health check functions)
* All HTTP request now add a user agent string identifying the SDK and it's version
* CampaignException has been improved to report errors on both SOAP and HTTP requests. It's now defined in `campaign.js`
* Added full jsdoc documentation of the SDK (run with `npm run jsdoc`). Result is saved in the `doc/jsdoc` folder
* Use "strict" mode
* Use E6 classes instead of prototype based inheritance
* Using `axios` as the default protocol instead of `request-promise-native` which is deprecated
* Added the notion of observer that can be called on any SOAP or HTTP request
* SOAP calls now have an "internal" flag, which indicates if the SOAP calls comes from the framework itself (for example, the framework will load schemas) or from a client app
* All session and security tokens are removed from logs 
* Moved to DomUtil.isArray helper function to a new Utils package (internal)
* Fixed many tests which were not executed corresctly (assertion was not executed, leading to think the test was successful)
* Fixed CVE-2021-23343 in dependencies

_Breaking changes in 1.0.0_
* The default representation is now `SimpleJson` instead of `BadgerFish`
* Changes in the `sdk.init`, `Client` constructor, and `logon` functions. Now using `ConnectionParameters` and `Credentials` objects to configure a Campaign connection
* Client object members are now private: access to representation, etc. attributes is not allowed anymore except for `NLWS`, `XtkCaster`, and `DomUtil`
* Access to the `sessionInfo` object after `logon` can be done via the new `getSessionInfo` call
* Options cache internal strucutre change: option values in the cache are now object litterals containing the option value, type, and raw value (which may not be casted to the expected type yet)
* Connecting to mid-sourcing (or other Campaign instances which are defined by an external account) is now done with the `ConnectionParameters.ofExternalAccount` function. As a consequence, `getSecretKeyCipher` is now private and deprecated
* CampaignException object signature changed (but was not previously exposed)
* The client-side bundle is now generated in the `dist/bundle.js` file instead of `bundle.js``
* The main global object for the client SDK is now `document.accSDK` and not `accSDK`
* The client.traceSOAPCalls() function is now named client.traceAPICalls because it traces both SOAP and HTTP calls

---

## Version 0.1.24
_2021/09/16_
* Fix potential security vulnerabilities in the dependencies

## Versin 0.1.23
_2021/07/27_
* Support for int64 type (represented as a string to avoid rounding errors)
* Fix issue with the SoapAction header for interface methods. When calling a method which is defined on an interface (for instance xtk:persist), the SoapAction
  header must use the interface id and not the schema id. For instance, when one calls the xtk:session Write method, one should call NLWS.xtkSession.Write, but
  the SoapAction header must be "xtk:persist#Write" and not "xtk:session#Write" for the call to complete successfully. In older SDK versions, one had to call
  NLWS.xtkPersist.Write which would only work if the xtk:persist interface schema was cached before. As there's no xtk:schema entity for the interfaces, the only
  way to cache such an interface is to have previously called a method on xtk:session. This call will indirectly cache the xtk:session schema and its interfaces,
  hence xtk:persist. From SDK 0.1.23 on, while the previous (incorrect) syntax NLWS.xtkPersist.Write still works, it's recommended to use NLWS.xtkSession.Write
* Upgrade 3rd parties (browserslist, hosted-git-info, lodash, ws) to fix vulnerabilities

## Version 0.1.22
_2021/02/23_
* Update node-notifier library (used by jest) to version 8.0.1 to fix a possible injection

### Version 0.1.20
Add client.hasPackage function to test if a package is installed or an instance or not (https://github.com/adobe/acc-js-sdk/issues/5)

### Version 0.1.3
Bug fixes
* Query returning empty result should return null when getIfExists operation, should fail when using get operation, and should return an empty array with select operation (https://github.com/adobe/acc-js-sdk/issues/3)

### Version 0.1.2
* Use github action to automatically publish to npm when one pushes a commit with the message "Release 1.2.3"

### Version 0.1.1
Bug fixes
* Query in select mode should always return an array, even if result is empty or one one row (https://github.com/adobe/acc-js-sdk/issues/1)


### Version 0.1.0
Initial version

