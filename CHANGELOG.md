# Adobe Campaign Classic (ACC) SDK in JavaScript (node.js and browser)

This is a node.js SDK for Campaign API. It exposes the Campaign API exactly like it is used inside Campaign using the NLWS notation.


# Changelog

## Version 1.0.0
_2021/07/29_
* Support for a simpler flavor of JSON (see SimpleJson vs. BadgerFish) which is now the default
* Finalize the implementation to support int64
* Add 100% coverage for all tests
* Make some members of the Client object private to clarify what is the public API
* Fixed bug in JSON serialization for XML elments having an attribute named "length" (see `DomUtil.isArray`)
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

_Breaking changes in 1.0.0_
* The default representation is now `SimpleJson` instead of `BadgerFish`
* Changes in the `sdk.init`, `Client` constructor, and `logon` functions. Now using `ConnectionParameters` and `Credentials` objects to configure a Campaign connection
* Client object members are now private: access to representation, etc. attributes is not allowed anymore except for `NLWS`, `XtkCaster`, and `DomUtil`
* Access to the `sessionInfo` object after `logon` can be done via the new `getSessionInfo` call
* Options cache internal strucutre change: option values in the cache are now object litterals containing the option value, type, and raw value (which may not be casted to the expected type yet)
* Connecting to mid-sourcing (or other Campaign instances which are defined by an external account) is now done with the `ConnectionParameters.ofExternalAccount` function. As a consequence, `getSecretKeyCipher` is now private and deprecated

---

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
