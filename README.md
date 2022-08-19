# Adobe Campaign Classic (ACC) SDK in JavaScript (node.js and browser)

This is a node.js SDK for Campaign API. It exposes the Campaign API exactly like it is used inside Campaign using the NLWS notation.



# Change log

See the [Change log](./CHANGELOG.md) for more information about the different versions, changes, etc.


# Overview

    The ACC JavaScript SDK is a JavaScript SDK which allows you to call Campaign APIs in a simple, expressive and JavaScript idiomatic way. It hides away the Campaign complexities associated with having to make SOAP calls, XML to JSON conversion, type formatting, etc.

The API is fully asynchronous using promises and works as well on the server side than on the client side in the browser.

Install
```js
npm install --save @adobe/acc-js-sdk
```

The SDK entrypoint is the `sdk` object from which everything else can be created.

```js
const sdk = require('@adobe/acc-js-sdk');
```

You can get version information about the SDK
```js
console.log(sdk.getSDKVersion());
```

which will return the SDK name and version (the actual name and version number will depend on the version you have installed)
```
{
  version: "1.0.0",
  name: "@adobe/acc-js-sdk",
  description: "ACC Javascript SDK",
}
```


# QuickStart
Here's a small node.js application which displays all the target mappings in Campaign.

Create a new node.js application
```sh
mkdir acc-js-sdk-qstart
cd acc-js-sdk-qstart
npm i --save @adobe/acc-js-sdk
```

Now create a simple `index.js` flle. Replace the endppoint and credentials with your own
```js
const sdk = require('@adobe/acc-js-sdk');

(async () => {
    // Display the SDK version
    const version = sdk.getSDKVersion();
    console.log(`${version.description} version ${version.version}`);

    // Logon to a Campaign instance with user and password
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                        "https://myInstance.campaign.adobe.com", 
                                        "admin", "admin");
    const client = await sdk.init(connectionParameters);
    await client.logon();
    const NLWS = client.NLWS;

    // Get and display the list of target mappings
    const queryDef = {
        schema: "nms:deliveryMapping",
        operation: "select",
        select: {
            node: [
                { expr: "@id" },
                { expr: "@name" },
                { expr: "@label" },
                { expr: "@schema" }
            ]
        }
    };
    const query = NLWS.xtkQueryDef.create(queryDef);
    const mappings = await query.executeQuery();
    console.log(`Target mappings: ${JSON.stringify(mappings)}`);
})().catch((error) => {
    console.log(error);
});
```

Run it
```sh
node index.js
```

It will display something like this
```
ACC Javascript SDK version 1.0.0
Target mappings: {"deliveryMapping":[{"id":"1747","label":"Recipients","name":"mapRecipient","schema":"nms:recipient"},{"id":"1826","label":"Subscriptions","name":"mapSubscribe","schema":"nms:subscription"},{"id":"1827","label":"Operators","name":"mapOperator","schema":"xtk:operator"},{"id":"1828","label":"External file","name":"mapAny","schema":""},{"id":"1830","label":"Visitors","name":"mapVisitor","schema":"nms:visitor"},{"id":"2035","label":"Real time event","name":"mapRtEvent","schema":"nms:rtEvent"},{"id":"2036","label":"Batch event","name":"mapBatchEvent","schema":"nms:batchEvent"},{"id":"2070","label":"Subscriber applications","name":"mapAppSubscriptionRcp","schema":"nms:appSubscriptionRcp"}]}
````



# API Basics

In order to call any Campaign  API, you need to create a `Client` object first. You pass it the Campaign URL, as well as your credentials. 

```js
const sdk = require('@adobe/acc-js-sdk');
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin");
const client = await sdk.init(connectionParameters);
```

## Connection options

Connection parameters can also be passed an option object with the following attributes
Attribute|Default|Description
---|---|---
representation|"SimpleJson"| See below. Will determine if the SDK works with xml of json object. Default is JSON
rememberMe|false| The Campaign `rememberMe` attribute which can be used to extend the lifetime of session tokens
entityCacheTTL|300000| The TTL (in milliseconds) for the xtk entity cache
methodCacheTTL|300000| The TTL (in milliseconds) for the xtk method cache
optionCacheTTL|300000| The TTL (in milliseconds) for the xtk option cache
traceAPICalls|false| Activates tracing of API calls or not
transport|axios|Overrides the transport layer
noStorage|false|De-activate using of local storage
storage|localStorage|Overrides the local storage for caches
refreshClient|undefined|Async callback to run when the session token is expired
charset|UTF-8|The charset encoding used for http requests. In version 1.1.1 and above, the default will be UTF-8. It's possible to override (including setting an empty character set) with this option.
extraHttpHeaders|[string]:string|An optional dictionary (key/value pairs) of extra HTTP headers to pass to all API calls.
clientApp|string|An optional string describing the name and version of the SDK client application. It will be passed to the server in the ACC-SDK-Client-App HTTP header
noSDKHeaders|boolean|Can be set to disable passing ACC-SDK-* HTTP headers to the server
noMethodInURL|boolean|Can be set to true to remove the method name from the URL
timeout|number|Can be used to set the APIs call timeout (in ms)
```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin",
                                    { representation: "xml", rememberMe: true });
```

## Login with IMS

The SDK also supports IMS service token with the `ofUserAndServiceToken` function. Pass it a user to impersonate and the IMS service token.

In that context, the IMS service token grants admin-level privileges, and the user indicates which Campaign user to impersonate. 
```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "==ims_service_token_here");
```
## Login with IMS access token
The SDK supports IMS access token of an IMS user with the `ofBearerToken` function. Pass it a bearer token.
```js
const connectionParameters = sdk.ConnectionParameters.ofBearerToken(
                                    "https://myInstance.campaign.adobe.com", 
                                    "ims_bearer_token");
````

## Login with Session token

Campaign supports authenticating with a session token in some contexts. This is usually used for Message Center API calls (see the "Message Center" section below).

In this example, the session token is a string composed of the user name, a slash sign, and the password (often empty)

```js
const connectionParameters = sdk.ConnectionParameters.ofSessionToken(url, "mc/mc");
```

Note that this authentication mode is very specific and does not actually performs a Logon: the session token will be passed to each API calls as-is (with an empty security token) and requires proper setup of the security zones for access to be granted.

Another consequence is that the Application object will not be available (client.application will be undefined) when using this authentication mode. The reason is that the application object requires an actual login call to be made to be populated.


## Anonymous logon

Several Campaign APIs are anonymous, i.e. do not require to actually logon to be used. For instance the "/r/test" API is anonymous. The SDK supports anonymous APIs but still need to be initialized with anonymous credentials as follows. Of course, anonymous APIs also work if you are logged on with a different method.

```js
const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser(url);
const client = await sdk.init(connectionParameters);
```

## Logon with Security token

If you want to use the SDK client-side in a web page returned by Campaign, you cannot use the previous authentication functions because you do not know the user and password, and because you cannot read the session token cookie.

For this scenario, the `ofSecurityToken` function can be used. Pass it a security token (usually available as document.__securitytoken), and the SDK will let the browser handle the session token (cookie) for you.

```html
<script src="acc-sdk.js"></script>
<script>
        (async () => {
            try {
                const sdk = document.accSDK;
                var securityToken = "@UyAN...";
	            const connectionParameters = sdk.ConnectionParameters.ofSecurityToken(url, securityToken);
                const client = await sdk.init(connectionParameters);
                await client.logon();
                const option = await client.getOption("XtkDatabaseId");
                console.log(option);
            } catch(ex) {
                console.error(ex);
            }
        })();
</script>
</body>
</html>
```

Note: if the HTML page is served by the Campaign server (which is normally the case in this situation), you can pass an empty url to the `ofSecurityToken` API call.


## LogOn / LogOff

The `sdk.init` call will not actually connect to Campaign, you can call the `logon` method for this. Logon does not need to be called when using session-token authentication or anonymous authentication.

```js
await client.logon();
```

```js
await client.logoff();
```

## refreshClient callback
The refreshClient is an async callback function with the SDK client as parameter, it is called when the ACC session is expired.
The callback must refresh the client session and return it. if a SOAP query fails with session expiration error then it will be retried when the callback is defined.

```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    url, "admin", "admin",
                                    { refreshClient: async (client) => {
                                        await client.logon();
                                        return client;
                                    }});
```

## IP Whitelisting

Campaign includes an IP whitelisting component which prevents connections from unauthorized IP addresses. This is a common source of authentication errors. 

A node application using the SDK must be whitelisted to be able to access Campaign. The SDK `ip` function is a helper function that can help you find the IP or IPs which need to be whitelisted.

This API is only meant for troubleshooting purposes and uses the `https://api.db-ip.com/v2/free/self` service.

```js
const ip = await sdk.ip();
```

Will return something like

```json
{ "ipAddress":"AAA.BBB.CCC.DDD","continentCode":"EU","continentName":"Europe","countryCode":"FR","countryName":"France","stateProv":"Centre-Val de Loire","city":"Bourges" }
```

## Calling static SOAP methods

The NLWS object allows to dynamically perform SOAP calls on the targetted Campaign instance.
```js
const NLWS = client.NLWS;
```

Static SOAP methods are the easiest to call. Once you have a `NLWS` object and have logged on to the server, call a static mathod as followed. This example will use the `xtk:session#GetServerTime` method to displayt the current timestamp on the server.


```js
const NLWS = client.NLWS;
result = await NLWS.xtkSession.getServerTime();
console.log(result);
```

where
* `xtkSession` is made of the namespace and entity to which the API applies. For instance `xtk:session` -> `xtkSession`
* `getServerTime` is the method name. In ACC, method names start with an upper case letter, but in JS SDK you can put it in lower case too (which is preferred for JavaScript code).


## Parameter types

In Campaign, many method attributes are XML elements or documents, as well as many return types. It's not very easy to use in JavaScript, so the SDK supports automatic XML<=> JSON conversion. Of yourse, you can still use XML if you want.

We're supporting 2 flavors of JSON in addition to XML.
* `SimpleJson` which is the recommeded and default representation
* `BadgerFish` which was the only and default before 1.0.0, and is now a legacy flavor of JSON. It's a little bit complex and was deprecated in favor of `SimpleJson` (http://www.sklar.com/badgerfish/) 
* `xml` which can be use to perform no transformation: Campaign XML is returned directly without any transformations.


The representation can set when creating a client. It's recommended to keep it to `SimpleJson`.
```js
const client = await sdk.init("https://myInstance.campaign.adobe.com", "admin", "admin", { representation: "SimpleJson" });
```

Here's an example of a queryDef in SimpleJson). This query will return an array containing one item for each external account in the Campaign database. Each item will contain the account id and name.

```
const queryDef = {
    schema: "nms:extAccount",
    operation: "select",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@name" }
        ]
    }
};
```

## Method-level representation

The client object is created with a default representation which is used for all API calls in the context of this client. Since version 1.1.2, it is also possible to set the representation at the method level, i.e. use a particular representation for a particular API call.

* `client.NLWS`: use the default representation set at the client level
* `client.NLWS.xml`: use the XML reresentation
* `client.NLWS.json`: use the SimpleJson representation


## SimpleJson format
The Simple JSON format works like this:

The XML root element tag is determined by the SDK as it's generating the XML, usually from the current schema name.

* XML: `<root/>
`
* JSON: `{}`

XML attributes are mapped to JSON attributes with the same name, whose litteral value can be a string, number, or boolean. There's no "@" sign in the JSON attribute name.
Values in JSON attributes can be indifferently typed (ex: number, boolean), or strings (ex: "3" instead of just 3) depending if the conversion could determine the attribute type or not. 
API users should expect and handle both value and use the `XtkCaster` object to ensure proper conversion when using.

* XML: `<root hello="world" count=3 ok=true/>`
* JSON: `{ hello:"world", count:3, ok:true }`

XML elements are mapped to JSON objects

* XML: `<root><item id=1/></root>`
* JSON: `{ item: { id:1 } }`

If the parent element tag ends with `-collection` children are always an array, even if there are no children, or if there is just one child. The rationale is that XML/JSON conversion is ambigous : XML can have multiple elements with the same tag and when there's only one such element, it's not possible to determine if it should be represented as a JSON object or JSON array unless we have additional metadata. 

* XML: `<root-collection><item id=1/></root>`
* JSON: `{ item: [ { id:1 } ] }`

When an XML element is repeated, an JSON array is used

* XML: `<root><item id=1/><item id=2/></root>`
* JSON: `{ item: [ { id:1 }, { id:2 } ] }`

Text of XML element is handle with the `$` sign in the JSON attribute name, or with a child JSON object name `$`

Text of the root element
* XML: `<root>Hello</root>`
* JSON: `{ $: "Hello" }`

Text of a child element
* XML: `<root><item>Hello</item></root>`
* JSON: `{ $item: "Hello" }`
* Alternative JSON: `{ item: { $: "Hello" } }`

If an element contains both text, and children, you need to use the alternative `$` syntax
* XML: `<root><item>Hello<child id="1"/>
</item>
</root>`
* JSON: `{ item: { $: "Hello", child: { id:1 } }`


## BadgerFish format

To distinguish between BadgerFish and SimpleJson format, all BadgerFish objects will have the BadgerFishObject class, that includes the top-level object, but also all children objects. A badgerfish object can be created as follows. It will automatically convert all the object literals into BadgerFishObjet class.

```
const obj = new DomuUtil.BadgerFishObject({ "@att":"value });
```


## Returning multiple values
Campaign APIs can return one or multiple values. The SDK uses the following convention:
* no return value -> returns `null`
* one return value -> returns the value directly
* more that one return value -> returns an array of values


## Calling non-static APIs

To call a non-static API, you need an object to call the API on. You create an object with the `create` method.
For instance, here's how one creates a QueryDef object.

```js
const queryDef = {
    schema: "nms:extAccount",
    operation: "select",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@name" }
        ]
    }
};
const query = NLWS.xtkQueryDef.create(queryDef);
```

Note: the returned object is opaque and private, it should not be directly manipulated.

The method can then be called directly on the object
```js
const extAccounts = await query.executeQuery();
```

In this example, the result is as follows

```js
{ extAccount:[
    { id: "2523379", name: "cda_snowflake_extaccount" },
    { id: "1782",    name: "defaultPopAccount" },
    { id: "3643548", name: "v8" }
]}
```

Some methods can mutate the object on which they apply. This is for instance the case of the xtk:queryDef#SelectAll method. You call it on a queryDef, and it internally returns a new query definition which contain select nodes for all the nodes of the schema. When such a method is called, the SDK will know how to "mutate" the corresponding object.

```js
const  queryDef = {
    schema: "xtk:option",
    operation: "get",
    where: { condition: [ { expr:`@name='XtkDatabaseId'` } ] }
  };
await query.selectAll(false);
var result = await query.executeQuery();
```

In the previous example, a queryDef is created without any select nodes. Then the selectAll method is called. After the call, the JavaScript queryDef object will contain a select elements with all the nodes corresponding to attributes of the xtk:option schema.

## Campaign data types

Campaign uses a typed system with some specificities:
* for strings, "", null, or undefined are equivalent
* numerical values cannot be null or undefined (0 is used instead)
* boolean values cannot be null or undefined (false is used instead)
* conversion between types is automatic based on their ISO representation


|     Xtk type |    | JS type | Comment |
| ------------ |----|-------- | --- |
|       string |  6 |  string | never null, defaults to "" |
|         memo | 12 |  string |
|        CDATA | 13 |  string |
|         byte |  1 |  number | signed integer in the [-128, 128[ range. Never null, defaults to 0 |
|        short |  2 |  number | signed 16 bits integer in the [-32768, 32768[ range. Never null, defaults to 0 |
|         long |  3 |  number | signed 32 bits integer. Never null, defaults to 0 |
|        int64 |    | string  | signed 64 bits integer. As JavaScript handles all numbers as doubles, it's not possible to properly represent an int64 as a number, and it's therefore represented as a string.
|        float |  4 |  number | single-percision numeric value. Never null, defaults to 0 |
|       double |  5 |  number | single-percision numeric value. Never null, defaults to 0 |
|     datetime |  7 |    Date | UTC timestamp with second precision. Can be null |
|   datetimetz |    |         | |
| datetimenotz |    |         | |
|         date | 10 |    Date | UTC timestamp with day precision. Can be null |
|      boolean | 15 | boolean | boolean value, defaultint to false. Cannot be null |
|     timespan |    |         | |


The SDK user does not have to handle this, but outside of the Campaign ecosystem, those rules may not apply and you probably do not want to use a number for a string, etc. The `XtkCaster` class is here to help.

You get a static `XtkCaster` object like this
```js
const XtkCaster = sdk.XtkCaster;
```

or directly from the client for convenience
```js
const XtkCaster = client.XtkCaster;
```

To convert a Campaign value into a given type, use one of the following.
```js
stringValue = XtkCaster.asString(anyValue);
booleanValue = XtkCaster.asBoolean(anyValue);
byteValue = XtkCaster.asByte(anyValue);
shortValue = XtkCaster.asShort(anyValue);
int32Value = XtkCaster.asLong(anyValue);
numberValue = XtkCaster.asNumber(anyValue);
timestampValue = XtkCaster.asTimestamp(anyValue);
dateValue = XtkCaster.asDate(anyValue);
```

More dynamic conversions can be achieved using the `as` function. See the types table above for details.

```js
stringValue = XtkCaster.as(anyValue, 6);
```

In addition, the following helpers are available
* `XtkCaster.isTimeType` to test if a data type is a date, time or timestamp
* `XtkCaster.isStringType` to test if a data type is a string type (string, memo, etc.)
* `XtkCaster.isNumericType` to test if a data type is a numeric type


## DOM helpers


DOM manipulation is sometimes a bit painful. The `DomUtil` helper provides a few convenience functions

```js
const DomUtil = sdk.DomUtil;
```

or

```js
const DomUtil = client.DomUtil;
```


Create DOM from XML string:
```js
const doc = DomUtil.parse(`<root>
<one/>
</root>`);
```

Writes a DOM document or element as a string:
```js
const s = DomUtil.toXMLString(docOrElement);
```

Creates a new document
```js
const queryDoc = DomUtil.newDocument("queryDef");
```

Escape text value
```js
const escaped = DomUtil.escapeXmlString(value);
```

Find element by name (finds the first element with given tag). This is a very common operation when manipulating Campaign XML documents
```js
const el = DomUtil.findElement(parentElement, elementName, shouldThrow);
```

Get the text value of an elemennt. This will accomodate text elements, cdata elements, as well has having multiple text child element (which is ususally not the case in Campaign)
```js
const text = DomUtil.elementValue(element);
```

Iterates over child elements
```js
var child = DomUtil.getFirstChildElement(parentElement);
while (child) {
    ...
    child = DomUtil.getNextSiblingElement(child);
}
```

Iterates over child elements of a given type
```js
var methodChild = DomUtil.getFirstChildElement(parentElement, "method");
while (methodChild) {
    ...
    methodChild = DomUtil.getNextSiblingElement(methodChild, "method");
}
```

Get typed attribute values, with automatic conversion to the corresponding xtk type, and handling default values
```js
const stringValue = DomUtil.getAttributeAsString(element, attributeName)
const byteValue = DomUtil.getAttributeAsByte(element, attributeName)
const booleanValue = DomUtil.getAttributeAsBoolean(element, attributeName)
const shortValue = DomUtil.getAttributeAsShort(element, attributeName)
const longValue = DomUtil.getAttributeAsLong(element, attributeName)
```

JSON to XML conversion (SimpleJson by default)
```js
const document = DomUtil.fromJSON(json);
const json = DomUtil.toJSON(documentOrElement);
```

BadgerFish can be forced as well
```js
const document = DomUtil.fromJSON(json, "BadgerFish");
const json = DomUtil.toJSON(documentOrElement, "BadgerFish");
```

## Passing XML parameters
Many Campaign APIs take arguments which are DOM documents or DOM elements. For example, the nms:delivery#DeployTriggerMessages first argument is a DOMElement which is supposed to be a `<where>` clause used as a condition to select Message Center deliveries to publish.

```xml
<method name="DeployTriggerMessages" static="true">
<parameters>
<param inout="in" name="deliveries" type="DOMElement"/>
<param inout="in" name="localPublish" type="boolean"/>
</parameters>
</method>
```

For example, one would want to use the following condition to republish a particular delivery

```js
    await client.NLWS.nmsDelivery.DeployTriggerMessages({
      condition: [ {
        expr: "@internalName='DM23'"
      }]
    }, false);
```

The JSON object corresponds to the following XML
```xml
<where>
<condition expr="@internalName='DM23'"/>
</where>
```

Note that in XML, unlike JSON, the root element `<where>` is explicitely named "where". When converting JSON to XML, there is no way for the SDK to know which tag name to used for the root XML element. The SDK contains some code to set it for the most common situation, but will rely on the user to specify, when necessary, the name of the root elment. This can be done using the `xtkschema` (all case insensitive) attribute as follows:
```js
    await client.NLWS.nmsDelivery.DeployTriggerMessages({
      xtkschema: 'xtk:where',
      condition: [ {
        expr: "@internalName='DM23'"
      }]
    }, false);
```

When the `xtkschema` attribute is set, the part after the colon (i.e. "where" in this example) will be used as the root element, effectively generating the right XML.

In our example, the `DeployTriggerMessages` will work properly regardless of the XML root of its `deliveries` parameter, so it's not needed to actually set the `xtkschema` attribute, but it's a best practice to do so, because some APIs will actually depend on receiving the right tag name.

## Error Management

If an API call fails (SOAP fault or HTTP error), a `CampaignException` object is thrown. This object contains the following attributes

* `message` a message describing the error
* `statusCode` a HTTP status code. In case of a SOAP fault, the status code will be 500
* `errorCode` the Campaign error code if one is available (ex: XSV-350013)
* `methodCall` the SOAP call which caused the error. It will contain the following attributes
    * `type` the type of the API call ("SOAP" or "HTTP")
    * `urn` the SOAP call URN, i.e. the schema id. Will be empty for HTTP methods
    * `url` the HTTP URL
    * `methodName` the name of the SOAP method. For HTTP methods, the query path
    * `request` the raw SOAP request, as text. For HTTP requests, this is an option object containing details about the request
    * `response` the raw SOAP/HTTP response, as text
* `faultCode` for SOAP faults, the Campaign error code
* `faultString` the error message
* `detail` optional additional details about the error

In general all errors are mapped to a CampaignException and we try to keep the semantic of errors: for instance a call with an incorrect parameter will return an HTTP stauts of 400 even if it's not actually a, HTTP call. SDK specific errors will have an errorCode with the "SDK-######" format, using "SDK" as a prefix.

```js
  try {
    await client.logon();
    result = await NLWS.xtkSession.getServerTime();
  } catch (ex) {
    console.log(ex.message);
  }
```

It's also noteworthy that all the data returned in a CampaignException is trimmed, i.e. session and security token values are hidden, so that the exception object can be safely logged.

## Caches

The following caches are managed by the SDK and active by default. They are in-memory caches.

* Options cache. Stores typed option values, by option name.
* Entity cache. Caches schemas and other entities
* Method cache. Cahces SOAP method definitions.

Caches can be cleared at any time
```js
client.clearOptionCache();
client.clearMethodCache();
client.clearEntityCache();
```

or 
```js
client.clearAllCaches();
```

Caches have a TTL of 5 minutes by default. The TTL can be changed at connection time using connection options `entityCacheTTL`, `methodCacheTTL`, and `optionCacheTTL`.

Caches can be de-activated by setting a TTL of -1 which will have the effect of making all cached data always invalid.



## Persistent caches
In addition to memory caches, it is possible to use persistent caches as well. This was introduced in version 1.0.5 and is active by default as well when using the SDK in a browser. The browser local storage is used (if allowed).

Cached data is stored in local storage with keys prefixed with  `acc.js.sdk.{{version}}.{{server}}.cache.` where `version` is the SDK version and `server` is the Campaign server name. This means that the cached data is lost when upgrading the SDK.

It's possible to disable persistent caches using the `noStorage` connection option.

It is also possible to setup one's own persistent cache, by passing a `storage` object as a connection option. This object should implement 3 methods: `getItem`, `setItem`, and `removeItem` (synchronous)


## Auto-refresh caches

The SDK includes a mechnism to maintain the schemas and options caches up-to-date by polling the Campaign server on a regular basis (10 seconds by default). The server returns the list of entities (schemas or options) which have changed since they were cached, and the client removes them from the cache. When a schema changes, the corresponding methods are also removed from the method cache.

This mechanism is not activate by default but can be activated or deactivated by the following functions

```js
client.startRefreshCaches(30000);   // activate cache auto-refresh mechanism every 30s
client.stopRefreshCaches();         // de-activate cache auto-refresh
```

This mechanism is based on the `xtk:session#GetModifiedEntities` SOAP method which is only available in Campaign 8.4 and above only. For other builds of Campaign, the auto-refresh mechanism will not do anything. 

The following changes are handled:
* If the build number has changed, the whole cache is cleared
* If more than 10 schemas or options have changed, the whole cache is cleared
* if less than 10 schemas or options have changed, only those entities are removed from the cache


The refresh mechanism includes the following guardrails
* Both xtk:option and xtk:schema caches are refreshed every n seconds. To avoid issuing two API calls at the same time to the server, the schema cache refresh call is delayed by a few seconds. In the future this delay may change.
* If the xtk:session#GetModifiedEntities API is not available, the auto refresh mechanism will silently stop automatically
* If an error occurs while trying to refresh, a warning will be logged to the JavaScript console but the auto refresh will not be stopped. 

## Passwords

External account passwords can be decrypted using a Cipher. This function is deprecated since version 1.0.0 since it's not guaranteed to work in future versions of Campaign (V8 and above)

```js
const cipher = await client.getSecretKeyCipher();
const password = cipher.decryptPassword(encryptedPassword);
````

> **warning** This function is deprecated in version 1.0.0 of the SDK because it may break as we deploy Vault.

In order to set the password of an external account, you can use the `encryptPassword` API as follow

```js
const password = await this._client.NLWS.xtkSession.encryptPassword('password');
const account = {
    xtkschema: "nms:extAccount",
    name: name,
    account: 'admin',
    server: server,
    password: password,
};
await this._client.NLWS.xtkSession.Write(account);
```


## HTTP Headers

### Out-of-the-box headers
In version 1.1.3 and above, the SDK will pass additional HTTP headers automatically

Header | Description
-------|------------
SOAPAction| name of the schema and SOAP method (ex: xtk:query#ExecuteQuery)
ACC-SDK-Version| Version of the SDK making the scores
ACC-SDK-Auth| Authentification type and ACC user
ACC-SDK-Client-App| Name of the application calling the client SDK
ACC-SDK-Call-RetryCount| In case an API call is retried, indicates the number of retries
ACC-SDK-Call-Internal| Indicates that an API call is performed byt the SDK for its own purpose

The `ACC-SDK` headers can be removed using the connection parameter `noSDKHeaders`.

### Custom HTTP headers
In version 1.1.3 and above, it is possible to pass additional HTTP headers or override HTTP headers set by the SDK. This can be done globally (i.e. for all API calls), or locally, i.e. just for a particular call, or both.

Http headers are passed through an object whose keys represent the header name and values the corresponding header value. Nothing particular is done in term of case sensitivity, headers will be passed as passed.

To set global HTTP headers for all API calls of a client, pass an http headers array in the connection parameters
```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin",
                                    { extraHttpHeaders: {
                                        "X-ACC-JS-SDK-LBSAFE": "1",
                                        "X-ACC-WEBUI-VERSION: "1.2"
                                    } });
```

Subsequent API calls will have the corresponding headers set.

To set more HTTP headers for a particular API call, use the "headers" method of the NLWS object.

```js
const query = client.NLWS
    .headers({'X-Test': 'hello'})
    .xtkQueryDef.create(queryDef);
await query.executeQuery();
```

## Timeouts

By default, the SDK has a timeout of 5s when running in a node.js environment, and uses the browser defaults when run inside a browser (using the fetch API).

It is possible to overwrite the transport layer (see `The Transport Protocol` and use your own code to make and configure HTTP requests) to tune the timeout value. It is a bit cumbersome though.

Instead, you can use the `timeout` parameter, and set it either globally, as a connection parameter, or even at the API call level but using the `PushDown` mechanism described below.

Sets a timeout of 10s gloally
```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin",
                                    { timeout: 10000 });
```

Override the timeout to 1 min for a particular API call
```js
NLWS.xml.pushDown({ timeout: 60000 }).xtkBuilder.installPackage(dom);
```

## Pushdown mechanism
The Pushdown mechanism can be used to push down variables to the transport layer. A common use case it to pass a custom timeout value down to the transport layer.

The pushed down parameters are passed as a second parameter to the transport function. This parameter will contain all the connection parameters as well as any parameter that you can push down at the API call level. API call pushdowns can override default pushdowns.

Any key/value pairs can be pushed down. This example pushes down the timeout and foo variables to the transport layer.
```js
NLWS.xml.pushDown({ timeout: 60000, foo: 'bar' }).xtkBuilder.installPackage(dom);
```

## Troubleshooting
In the version 1.1.5 of the SDK, we are automatically adding the SOAP method name in the URL in order to simplify troubleshooting. Normally, all SOAP method calls are make to the soaprouter.jsp endpoint, which makes it difficult to understand which actual API call is being made.
In fact the SOAP call name is available via the SOAPAction HTTP header, but it's usually not immediatelly visible.

The SOAP calls URLs are now formed like this: `http://acc-sdk:8080/nl/jsp/soaprouter.jsp?xtk:queryDef:ExecuteQuery` where the SOAP method name is added as a query parameter. Campaign server ignores this parameter.

This can be disabled using the `noMethodInURL` connection parameter

const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin",
                                    { noMethodInURL: true });


# Samples

The `samples` folder contains several samples illustrating how to use the various Campaing APIs.

A sample file looks like this
* It includes the `utils` library which contains a few helper functions.s
* It starts with an asynchronous auto-execute function that is used to run the sample from the command line
* This function contains one or more calls to the `utils.sample` function. Each such call describes and execute a sample.
* A sample file should not do anything else or have any side effect: all the actual sample code should be inside calls to `utils.sample`

| Note the use of `await` when calling `utils.sample`

```js
const utils = require("./utils.js");
( async () => {
  await utils.sample({
    title: "The Sample title",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get" ],
    description: `A description of the sample`,
    code: async() => {
      //... Sample code goes there
    }
  });

  await utils.sample({
    title: "A Second sample",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get" ],
    description: `A description of the sample`,
    code: async() => {
      //... Sample code goes there
    }
  });
})();
```

The `utils.sample` function takes 1 parameters describing the sample:
* `title` is the sample title, a short, human friendly name for the sample
* `labels` is a list of keywords that can be used to retreive the samples in a large list
* `description` is a longer, multi-line description of the sample
* `code` is an async function, the code of the sample

Most of the samples - actually all of them except some specific samples needing specific logon - will also use the `utils.logon` function. This is a helper function which will perform the Campaign Logon and Logoff for you, and call your callback function with pre-initialized `client` and `NLWS` objects

| Note the use of `await` when calling `utils.logon`

```js
  await utils.sample({
    title: "The Sample title",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get" ],
    description: `A description of the sample`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
          //... Sample code goes there
      });
    }
  });
```

### Running samples
Samples can be run from the command line. First, set 3 environment variables with your instance credentials:
```sh
export ACC_URL=https://myInstance.campaign.adobe.com
export ACC_USERadmin
export ACC_PASSWORD=...
```

and then run the samples
```sh
node samples/000\ -\ basics\ -\ logon.js
````




# Core API

## Get option value

A convenience function is provided, which returns a typed option value.
```js
var value = await client.getOption("XtkDatabaseId");
```

Options are cached because they are often used. It's possible to force the reload of an option:
```js
var value = await client.getOption("XtkDatabaseId", false);
```

It's also possible to call the API directly.
Use the `xtk:session:GetOption` method to return an option value and it's type. This call will not use the option cache for returning the option value, but will still cache the result.

```js
const optionValueAndType = await NLWS.xtkSession.getOption("XtkDatabaseId");
console.log("Marketing datbaseId: " + optionValueAndType);

Marketing datbaseId: u7F00010100B52BDE,6
```

If the option does not exist, it will return [ "", 0 ]

```js
var datbaseId = await client.getOption("XtkDatabaseId");
console.log(datbaseId);
```

The cache can be cleared
```js
client.clearOptionCache();
```


## Setting options

It's also possible to set options with the `setOption` function.
* It will create the option if necessary
* If the option already exists, it will use the existing value to infer the data type of the option

```js
await client.setOption("MyOption", "My value");
```

This is really a convenience function. You can always force an option type by using a writer on the xtk:option table, and using getOption to read back and cache the result.


## Test if a package exists
* Since: 0.1.20
* Test if a package is installed. Expects to be connected to an instance

```js
var hasAmp = client.hasPackage("nms:amp");
```

or
```js
var hasAmp = client.hasPackage("nms", "amp");
```


## Connect to mid-sourcing
From a marketing client connection, one can get a client to a mid server

```js
console.log("Connecting to mid server...");
const credentials = await sdk.Credentials.ofExternalAccount(client, "defaultEmailMid");
const midClient = await sdk.init(credentials);

await midClient.client.logon();
const datbaseId = await midClient.getOption("XtkDatabaseId");
console.log("Mid datbaseId: " + datbaseId);
await midClient.NLWS.xtkSession.testCnx();
console.log("Disconnecting from mid");
await midClient.client.logoff();
```

## Health check
Campaign proposes several APIs for health check. Just like all APIs in the SDK, it's been wrapped into a function and will return a XML or JSON object depending on the current representation

### /r/test
This API is anonymous and run directly on the Apache front server. Note that this API will failed if called on a tomcat endpoint (port 8080)
```js
const test = await client.test();
```

will return
```json
{
    "status":"OK",
    "date":"2021-08-27 03:06:02.941-07",
    "build":"9236",
    "sha1":"cc45440",
    "instance":"xxx_mkt_prod1",
    "sourceIP":"193.104.215.11",
    "host":"xxx.campaign.adobe.com",
    "localHost":"xxx-mkt-prod1-1"
}
```

Note: as this API is anonymous, one does not need to actually log on to Campaign to call it. Here's a full example. See the authentication section for more details about anonymous logon.
```js
const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser("https://...");
const client = await sdk.init(connectionParameters);
const test = await client.test();
```


### ping
The ping API is authenticated and will return a simple status code indicating the the Campaign server is running. It will also return the current database timestamp. The API itself will return plain text, but for convenience this has been wrapped into JSON / XML in the SDK
```js
const ping = await client.ping();
```

will return
```json
{
    "status":"Ok",
    "timestamp":"2021-08-27 12:51:56.088Z"
}
```

### mcPing
Message Center instances have a dedicated ping API which also returns the Message Center queue size and the maximum expected size (threshold). The API itself will return plain text, but for convenience this has been wrapped into JSON / XML in the SDK
```js
const ping = await client.mcPing();
```

will return
```json
{
    "status":"Ok",
    "timestamp":"2021-08-27 12:51:56.088Z",
    "eventQueueSize":"7",
    "eventQueueMaxSize":"400"
}
```

## The Transport Protocol

The SDK uses `axios` library internally to perform HTTP calls. This can be customized and one can use any other (async) protocol, which is implemented in the `transport.js` file.
The transport protocol defines
- What is an HTTP request
- What is the corresponding response
- How errors are handled

The transport protocol exports a single asynchronous function `request` which takes two parameters.

The first parameter is the request object with the following attributes. Note that it matches axios requests.
* `method` is the HTTP verb
* `url` is the URL to call
* `headers` is an object containing key value pairs with http headers and their values
* `data` is the request payload

The second parameter is an set of additional parameters that have been pushed down to the transport layer (see the `Pushdown` paragraph for more details). In particular, the `timeout` parameter should be honored by the transport layer.

If the request is successful, a promise is returned with the result payload, as a string.

If the request fails, the promise is rejected with an error object with class `HttpError`, a litteral with the following attributes:
* `statusCode` is the HTTP status code, such as 404, 500, etc.
* `statusText` is the HTTP status text coming with the error
* `data` is the response data, if any

For proper error handling by the ACC SDK, it's important that the actual class of returned objects is named "HttpError"

The transport can be overriden by using the `client.setTransport` call and passing it a transport function, i.e. an async function which
* Takes a `Request` object litteral as a parameter
* Returns a the request result in a promise
* Returns a rejected promise containing an `HttpError` in case of failure


## Observers

The Campaign client implements an observer mechanism that you can use to hook into what's hapenning internally.

An `Observer` is an object having any of the following methods:

For SOAP calls
* onSOAPCall(soapCall, safeCallData)
* onSOAPCallSuccess(soapCall, safeCallResponse) {}
* onSOAPCallFailure(soapCall, exception) {}

For HTTP calls (such as JSP, JSSP...). Note that despite SOAP calls are also HTTP calls, the following callbacks will not be called for SOAP calls.
* onHTTPCall(request, safeCallData)
* onHTTPCallSuccess(request, safeCallResponse) {}
* onHTTPCallFailure(request, exception) {}

The `soapCall` parameter is the SOAP call which is being observed. In the `onSOAPCall` callback, the SOAP call has not been executed yet.

The `request` parameter is the HTTP request (as defined in the transport protocol above)

The `safeCallData` and `safeCallResponse` represent the text XML of the SOAP request and response, but in which all session and security tokens have been replaced with "***" string. Hence the name "safe". You should use those parameters for any logging purpose to avoid leaking credentials.


The `soapCall` parameter is a `SoapMethodCall` object which describes the SOAP call. It has the following public attributes. 

* `urn` is the SOAP URN which corresponds to the Campaign schema id. For instance "xtk:session"
* `methodName` is the name of the method to call. For instance "Logon"
* `internal` is true or false, depending if the SOAP call is an internal SOAP call performed by the framework itself, or if it's a SOAP call issued by a SDK user
* `request` is a literal corresponding to the HTTP request. It's compatible with the `transport` protocol. It may be undefined if the SOAP call has need been completely built
* `response` is a string containing the XML result of the SOAP call if the call was successful. It may be undefined if the call was not executed yet or if the call failed


# Configuration

## Tracking all SOAP calls

SOAP calls can be logged by setting the `traceAPICalls` attribute on the client at any time. For security reasons, the security and session tokens values will be replaced by "***" to avoid leaking them

```js
client.traceAPICalls(true);
```

This is an example of the logs
````
SOAP//request xtk:session#GetOption <SOAP-ENV:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:ns="http://xml.apache.org/xml-soap">
<SOAP-ENV:Header>
<Cookie>__sessiontoken=***</Cookie>
<X-Security-Token>***</X-Security-Token>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<m:GetOption xmlns:m="urn:xtk:session" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<sessiontoken xsi:type="xsd:string">***</sessiontoken>
<name xsi:type="xsd:string">XtkDatabaseId</name>
</m:GetOption>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>

SOAP//response xtk:session#GetOption <?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema'
xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
xmlns:ns='urn:xtk:session'
xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
<GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
<pstrValue xsi:type='xsd:string'>uFE80000000000000F1FA913DD7CC7C4804BA419F</pstrValue>
<pbtType xsi:type='xsd:byte'>6</pbtType>
</GetOptionResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`````


# Query API

List all accounts
````
const queryDef = {
    schema: "nms:extAccount",
    operation: "select",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@name" }
        ]
    }
};
const query = NLWS.xtkQueryDef.create(queryDef);

console.log(query);
const extAccounts = await query.executeQuery();
console.log(JSON.stringify(extAccounts));
````

Get a single record
```js
var queryDef = {
    schema: "nms:extAccount",
    operation: "get",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@name" },
            { expr: "@label" },
            { expr: "@type" },
            { expr: "@account" },
            { expr: "@password" },
            { expr: "@server" },
            { expr: "@provider" },
        ]
    },
    where: {
        condition: [
            { expr: "@name='ffda'" }
        ]
    }
}
const query = NLWS.xtkQueryDef.create(queryDef);
const extAccount = await query.executeQuery();
```

## Escaping
It's common to use variables in query conditions. For instance, in the above example, you'll want to query an account by name instead of using the hardcoded "ffda" name. The `expr` attribute takes an XTK expression as a parameter, and 'ffda' is a string litteral in an xtk expression.

To prevent xtk ingestions vulnerabilities, you should not concatenate strings and write code such as expr: "@name = '" + name + "'": if the value of the name 
parameter contains single quotes, your code will not work, but could also cause vulnerabilities.

### sdk.escapeXtk

The `sdk.escapeXtk` can be used to properly escape string litterals in xtk expressions. The function will also surround the escaped value with single quotes.

You can use string concatenation like this. Note the lack of single quotes around the value.
```
    { expr: "@name=" + sdk.escapeXtk(name) }
```

or a template litteral
```
    `{ expr: "@name=${sdk.escapeXtk(name)}" }`
```

The `escapeXtk` function can also be used to create tagged string litterals. This leads to a much shorter syntax. Note that with this syntax, only the parameter values of the template litteral are escaped
```
    sdk.escapeXtk`{ expr: "@name=${name}" }`
```

This can also be used to escape other data types such as timestamps

```
    sdk.escapeXtk`{ expr: "@lastModified > = ${yesterday}" }`
```

will return `{ expr: "@lastModified > = #2021-07-07T10:03:33.332Z# }`


### sdk.escapeForLike

This function escapes values so that they can be used in SQL or XTK like conditions. For example a search term "term" can be escaped as follows to implement a search conditions

```
    expr: `Lower([${xpath}]) LIKE '%${sdk.escapeForLike(term)}%'`,
```

### sdk.expandXPath & sdk.unexpandXPath

In Campaign, xpaths are used to access attributes of entities. When XPaths are used in XTK expressions, there can be ambiguities, for instance, in the expression "country/@name", is "country/@name" a xpath or are we dividing the variable country by the value of the attribute @name?

Amibiguity can be resolved by "expanding" the xpath from "country/@name" to "[country/@name]". The square brackets indicate an xpath.

```
    const expandedXPath = sdk.expandXPath(xpath);
    const unexpandedXPath = sdk.unexpandXPath(expandedXPath);
```

### xtkConstText

This function allows to convert literal values to xtk text constants, providing correct serialization. For instance, text constants will be quoted with single quotes, timestamps with the "#" character, etc.

```
    expect(sdk.xtkConstText("Hello", "string")).toBe("'Hello'");
    expect(sdk.xtkConstText(-42.3, "double")).toBe("-42.3");
    expect(sdk.xtkConstText("2022-02-15T09:49:04.000Z", "datetime")).toBe("#2022-02-15T09:49:04.000Z#");
```


## Pagination
Results can be retrieved in different pages, using the `@lineCount` and `@startLine` attributes. For instance, retrieves profiles 3 and 4 (skip 1 and 2)

```js
var queryDef = {
    schema: "nms:recipient",
    operation: "select",
    lineCount: 2,
    startLine: 2,
    select: {
        node: [
            { expr: "@id" },
            { expr: "@email" }
        ]
    }
}
var query = NLWS.xtkQueryDef.create(queryDef);
var recipients = await query.executeQuery();
console.log(JSON.stringify(recipients));
```



# Writer API

Creates an image (data is base64 encoded)
```js
var data = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA9ElEQVQ4jaXTIUsFQRSG4eeKiBjEIBeDYDGoSUwGm81s8SdYtIhFhPMDbEaz/SIIZkGbWg1Gg0GwiIgYZPZuWBxn8bJvWXb2O+/scM70lAhjuMO1sF9IVaES61jFnjBbyLQKjurnJz6yr62CsI2t+m0gRhGERZw1Vk6zTFEQ+rjETOP3b7OqBr1G8SRusPYrc4I3LGCeapN37AqP443g8R/FiYNsZcgGSRCmq1ZxmEXa6Yt0hKh6/dAaLbOcd+H/XOGpi2AFU10EqWsTXQQ7wmsSPNdzP8DXCII0D41BSgxvXboHm1jCXDpnPbHfeME9znEh+AFoTyfEnWJgLQAAAABJRU5ErkJggg==";
var doc = {
    xtkschema: "xtk:image",
    _operation: "insert",
    namespace: "cus",
    name: "test.png",
    label: "Self test",
    type: "png",
    $data: data
};
await NLWS.xtkSession.write(doc);
````

Creates a folder (with image previously created)
```js
const folder = {
    xtkschema: "xtk:folder",
    _operation: "insert",
    parent-id: 1167,
    name: "testSDK",
    label: "Test SDK",
    entity: "xtk:folder",
    schema: "xtk:folder",
    model: "xtkFolder",
    "image-namespace": "cus",
    "image-name": "test.png"
};
await NLWS.xtkSession.write(folder);
````

Some objects, such as deliveries are created from templates. The `createFromModel` API is preferred in this case. Given a template name, and a patch object, it will return an object created from the template and the patch, applying all sort of business rules and default values. This object can be inserted using a writer.

In this example, an email delivery is created from the "mail" delivery template and it's label is set to "Hello".

Note the xtkschema attribute in the second parameter of the `createFromModel` API call which is needed for the SDK to perform the proper JSON to XML transformation.

```js
const mail = await client.NLWS.nmsDelivery.createFromModel('mail', { xtkschema:'nms:delivery', label:'Hello'});
await client.NLWS.xtkSession.write(mail);
````

# Workflow API

Start and stop wotkflows, passing either an id or workflow internal name
```js
await NLWS.xtkWorkflow.stop(4900);
await NLWS.xtkWorkflow.start(4900);
```

A workflow can be started with parameters. Variables, are passed as attributes of the parameters document.
```js
await NLWS.xtkWorkflow.startWithParameters(4900, { hello: "world" });
```

The variables can be used in the workflow as attributes of the `instance.vars` variable.

```js
logInfo(instance.vars.hello);
```



# Profiles and subscriptions

Create a recipient
```js
var recipient = {
    xtkschema: "nms:recipient",
    _operation: "insert",
    firstName: "Thomas",
    lastName: "Jordy",
    email: "jordy@adobe.com"
};
await NLWS.xtkSession.write(recipient);
```

Create multiple recipients
```js
var recipients = {
    xtkschema: "nms:recipient",
    recipient: [
        {
            _operation: "insert",
            firstName: "Christophe",
            lastName: "Protat",
            email: "protat@adobe.com"
        },
        {
            _operation: "insert",
            firstName: "Eric",
            lastName: "Perrin",
            email: "perrin@adobe.com"
        }
    ]
};
await NLWS.xtkSession.writeCollection(recipients);
```

List all recipients in Adobe
```js
var queryDef = {
    schema: "nms:recipient",
    operation: "select",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@firstName" },
            { expr: "@lastName" },
            { expr: "@email" }
        ]
    },
    where: {
        condition: [
            { expr: "GetEmailDomain(@email)='adobe.com'" }
        ]
    }
}
const query = NLWS.xtkQueryDef.create(queryDef);
var recipients = await query.executeQuery();
console.log(JSON.stringify(recipients));
```

Count total number of profiles
```js
var queryDef = {
    schema: "nms:recipient",
    operation: "count"
}
var query = NLWS.xtkQueryDef.create(queryDef);
var count = await query.executeQuery();
count = XtkCaster.asLong(count.count);
console.log(count);
```

Update a profile. In this case, use the "@email" attribute as a key. If the `@_key` attribute is not specified, the primary key will be used.
```js
var recipient = {
    xtkschema: "nms:recipient",
    _key: "@email",
    _operation: "update",
    firstName: "Alexandre",
    email: "amorin@adobe.com"
};
await NLWS.xtkSession.write(recipient);
```

Deletes a profile
```js
var recipient = {
    xtkschema: "nms:recipient",
    _key: "@email",
    _operation: "delete",
    email: "amorin@adobe.com"
};
await NLWS.xtkSession.write(recipient);
```

Deletes a set of profiles, based on condition. For instance delete everyone having an email address in adobe.com domain
```js
await NLWS.xtkSession.deleteCollection("nms:recipient", { condition: { expr: "GetEmailDomain(@email)='adobe.com'"} });
```


# Message Center

The Message Center API (`nms:rtEvent#PushEvent`) can be used to send transactional messages. It should be called on the Message Center execution instances, not on the marketing instances.

## Authentication
Two authentication mechanism are possible for Message Center. It is possible to use a user/password authentication and call the Logon method to get a session and security token, as all other APIs. When using this authentication mechanism, the caller is responsible to handle token expiration and must explicitely handle the case when the Message Center API call fails because of an expired token.

Another common authentication strategy is to define a trusted Security Zone for message center clients and setup this security zone to use the "user/password" as a session token.

Here's an example of authentication with this method
```js
const connectionParameters = sdk.ConnectionParameters.ofSessionToken(url, "mc/mc");
const client = await sdk.init(connectionParameters);
```

## Pushing events

Events can be pushed using the `nms:rtEvent#PushEvent` API call. For instance
```js
var result = await NLWS.nmsRtEvent.pushEvent({
    wishedChannel: 0,
    type: "welcome",
    email: "aggmorin@gmail.com",
    ctx: {
      $title: "Alex"
    }
});
console.log(`>> Result: ${result}`);
```

There are a couple of noteworthy things to say about this API when using SimpleJson serialization.

* The payload passed to the pushEvent API call is actuall a nms:rtEvent entity. Hence the wishedChannel, etc. are actually XML attributes. The default SimpleJson conversion works fine here, no need to prefix the attributes with the "@" sign.
* However, the `ctx` section is not structured. We do not have a schema to validate or guide the conversion. It is common to use XML elements instead of attributes in the ctx context. In the message center template, you'll find things like `<%= rtEvent.ctx.title %>`. The fact that "title" is used (in stead of "@title") implied that the ctx node will contain a title element, not a title attribute. For the SimpleJson conversion to work, it's therefore important to indicate "$title" as the JSON attribute name. This will guide the SimpleJson converted to use an XML element instead of an XML attribute


## Getting event status

There's no scalable API to get the status of a message center event. One can use the QueryDef API to query the nms:rtEvent table for testing purpose though.

To do so, the first step is to decode the event id returned by PushEvent. It is a 64 bit number, whose high byte is the message center cell (instance) id which handled the event. It's a number between 0 and 255. The lower bytes represent the primary key of the event. Note that this is subject to change in future versions of Campaign and should not be considered stable.

Clear high byte
```js
eventId = Number(BigInt(eventId) & BigInt("0xFFFFFFFFFFFFFF"));
```

Get event status
```js
var queryDef = {
schema: "nms:rtEvent",
operation: "get",
select: {
    node: [
        { expr: "@id" },
        { expr: "@status" },
        { expr: "@created" },
        { expr: "@processing" },
        { expr: "@processed" }
    ]
},
where: {
    condition: [
        { expr:`@id=${eventId}` }
    ]
}
}
query = NLWS.xtkQueryDef.create(queryDef);
var event = await query.executeQuery();
console.log(`>> Event: ${JSON.stringify(event)}`);
```



# Application

The `application` object can be obtained from a client, and will mimmic the Campaing `application` object (https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Application.html)

| Attribute/Method | Description |
|---|---|
| **buildNumber** | The server build number
| **version** | In SDK version 1.1.4 and above, returns the server version formatted as major.minor.servicePack (ex: 8.2.10)
| **instanceName** | The name of the Campaign instance
| **operator** | Information about the current operator (i.e. logged user), of class `CurrentLogin`
| **packages** | List of installed packages, as an array of strings
| async **getSchema**(schemaId) | Get a schema by id (see the Schemas section below)
| async **getEnumeration**(enumerationName, schemaOrSchemaId) | Get an enumeration
| **hasPackage**(name) | Tests if a package is installed or not


The `CurrentLogin` object has the following attributes / functions

| Attribute/Method | Description |
|---|---|
| **id** | the internal id (int32) of the operator
| **login** | the login name of the operator
| **computeString** | A human readable name for the operator
| **timezone** | The timezone of the operator
| **rights** | An array of strings describing the rights of the operators

# Schemas

Reading schemas is a common operation in Campaign. The SDK provides a convenient functions as well as caching for efficient use of schemas.

```js
const schema = await client.getSchema("nms:recipient");
console.log(JSON.stringify(schema));
```

A given representation can be forced
```js
const xmlSchema = await client.getSchema("nms:recipient", "xml");
const jsonSchema = await client.getSchema("nms:recipient", "SimpleJson");
```

System enumerations can also be retreived with the fully qualified enumeration name
```js
const sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
```

or from a schema
```js
const schema = await client.getSchema("nms:extAccount");
const sysEnum = await client.getSysEnum("encryptionType", schema);
```

Get a source schema
```js
var srcSchema = await NLWS.xtkPersist.getEntityIfMoreRecent("xtk:srcSchema|nms:recipient", "", false);
console.log(JSON.stringify(srcSchema));
```

## Schema API (aka XtkNodeDef)
The Schema API is the Campaign API which allows to access schemas and the corresponding node hierarchy in a programmatic way. It's simpler to use this API than to manipulate XML or JSON. The name XtkNodeDef comes from "Xtk Node Definition", where an XtkNode is a generic node in a schema definition.

The Schema API closely mimmics the Campaign server side API : https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Schema.html with the following differences:

* The `XtkSchema` and associated classes (`XtkSchemaNode`, `XtkSchemaKey`, `XtkEnumeration` and `XtkEnumerationValue`) are all immutable. There are currently no API to create schemas dynamically
* Not all methods and functions are implemented
* Several methods are asynchronous because they may require a server round trip to fetch schemas, etc.
* There could be slight differences in usage due to Campaign server side JavaScript using some E4X specific constructs to iterate over collections (ex: for each(...)) which are not available in standard JavaScript environments

The entry point is the application object. Obtain a schema from its id:

```js
const application = client.application;
const schema = await application.getSchema("nms:recipient");
```

This return a schema object of class `XtkSchema`


### Iterating over collections
The metadata SDK closely mimmics the Campaign API, but provides convenience functions to access collections of objects, such as the children of a node, the values of an enumeration, etc. using an `ArrayMap` structure which allows access as both an array and a map.

Access as a map. Child elements can be accessed with their names, as if it was a JavaScript map. For instance, accessing the gender of a recipient. This method is kept as a compatibility layer with the legacy API and older versions of the SDK but is deprecated / discouraged. The reason is that there are schemas which have attribut names such as "length", or element names such as "forEach" which collide with JavaScript objects.
```js
const schema = await client.application.getSchema("nms:recipient");
const enumerations = schema.enumerations;
// deprecated, discouraged
expect(enumerations.gender.label).toBe("Gender");
```

Instead, prefer the `get` function which can retreive any enumeration value
```js
const schema = await client.application.getSchema("nms:recipient");
const enumerations = schema.enumerations;
expect(enumerations.get("gender").label).toBe("Gender");
```

Elements can also be accessed as an array. In this example, we are iterating over the enumerations of a schema
```js
const schema = await client.application.getSchema("nms:recipient");
const enumerations = schema.enumerations;
for (let i=0; i<enumerations.length; i++) { 
    const enumeration = enumerations[i];
}
```

Note that this assumes that there is no enumeration called "length" which will override the "length" attribute. Schemas, schema elements, and sql schemas have attributes named "length", but they are attributes, and will therefore be named "@length" in the metadata API. There is no  element named "length" in out-of-the-box schemas.

The ArrayMap also behaves like an iterator and works fine with the `for...of` syntax
```js
const schema = await client.application.getSchema("nms:recipient");
const enumerations = schema.enumerations;
for (const enumeration of enumerations) { 
    ...
}
```

For convenience, the `map` and `forEach`, `find`, `filter`, `get`, and `flatMap` methods are also available and behave as expected:

```js
const schema = await client.application.getSchema("nms:recipient");
// comma separated list of enumerations
const enumerations = schema.enumerations.map(e => e.name).join(',');
```

```js
const schema = await client.application.getSchema("nms:recipient");
schema.enumerations.forEach(e => { ... });
```

The `for...in` loop is also supported but deprecated/discouraged as it may return incorrect results for collections having items whose key collide with javaScript properties (such as length, map, forEach, etc.). Use a `for...of` construcr instead, or the `map` or `forEach` functions.
```js
const schema = await client.application.getSchema("nms:recipient");
// deprecated, discouraged
for (const key in schema.enumerations) {
    ...
}
```

## Navigating schemas
The schema API is useful to quickly navigate in the schema hierarchy. Here are a few examples

Get the label of the email attribute of the nms:recipient schema
```js
const schema = await application.getSchema("nms:recipient");
const email = await schema.root.findNode("@email");
console.log(email.label);
```

The `findNode` function follows links and references
* The function now supports `ref` nodes. Ref nodes are schema nodes having a `ref` property which is a reference to another node, possibly in a different schema. 
    * If the xpath passed to the function ends with a ref node, the ref node itself will be returned. We're not following the reference. You can use the `refTarget` method to explicitely follow the reference
    * If the xpath traverse intermediate nodes which are ref nodes, the `findNode` method will follow the reference. For instance, the start activity in a workflow is a reference. Finding the xpath "start/@img" will follow the start reference and find the @img attribute from there

* Support for links. If the xpath parameter contains links, `findNode` will follow the link 
target with the same rules as for reference nodes. To get the target of a link, use the `linkTarget` method instead of `refTarget`.


For insance, you can get the country of a recipient who clicked in an email. This call follows the link from nms:broadLogRcp to nms:recipient and then from nms:recipient to nms:country, returning the country isoA3 attribute.
```js
const schema = await application.getSchema("nms:broadLogRcp");
const node = await schema.root.findNode("recipient/country/@isoA3");
```

The same syntax can be used for reference nodes. For instance, getting the attributes of the start activity of a workflow:
```js
const schema = await application.getSchema("xtk:workflow");
const node = await schema.root.findNode("start/@name");
```

In order to actually iterate over the children, things are a little bit more complicated
```js
const schema = await application.getSchema("xtk:workflow");
const start = await schema.root.findNode("start");
// start is the ref node, not the target of the ref. One need to explicitely
// follow the ref in order to get the list of children
const target = await start.refTarget();
target.children.forEach(child => ... );
```

To get the root node of the target of a link, use the `linkTarget` function
```js
const schema = await application.getSchema("nms:broadLogRcp");
const node = await schema.root.findNode("recipient/country");
// node is the country link, not the root node of the nms:country schema
const root = await node.linkTarget();
// root is the root node of the nms:country schema
```


### XtkSchema 

| Attribute | Description |
|---|---|
| **id** | The id of the schema. For instance "nms:recipient"
| **namespace** | The namespace of the schema. For instance "nms"
| **name** | The name of the schema (internal name)
| **label** | The label (i.e. human readable, localised) name of the node.
| **labelSingular** | The singular label (i.e. human readable, localised) name of the schema. The label of a schema is typically a plural.
| **isLibrary** | For schemas, indicates if the schema is a library
| **mappingType** |Schema mapping type. Usually "sql"
| **md5** | The MD5 code of the schema in the form of a hexadecimal string
| **xml** | The XML (DOM) corresponding to this schema.<br>Note: this attribute is not available in the JS SDK.
| **root** | The schema root node, if there is one. A reference to a `XtkSchemaNode`
| **enumerations** | Map of enumerations in this schema, indexed by enumeration name. Values are of type `XtkEnumeration`
| **userDescription** | The description of the schema in the form of a string.

A schema is also a `XtkSchemaNode` and the corresponding properties/methods are also availale.

### XtkSchemaNode

| Attribute | Description |
|---|---|
| **children** | A array/map of children of the node. See note on the ArrayMap structure below
| **dataPolicy** | Returns a string of characters which provides the data policy of the current node.
| **description** | A long, human readable, description of the node
| **editType** |Returns a string of characters which specifies the editing type of the current node.
| **enum** | The name of the enumeration for the node, or an empty string if the node does node have an enumeration. See `enumeration()` method to get the corresponding `XtkSchemaNode`
| **enumerationImage** | Returns the name of the image of the current node in the form of a string of characters.
| **folderModel** |Only on the root node, returns a string which contains the folder template(s). On the other nodes, it returns undefined.
| **image**  | Returns the name of the image in the form of a string of characters.
| **img** | Returns the name of the image in the form of a string of characters. (alias to `image` property)
| **integrity** | Returns the link integrity type.
| **keys** | A array/map of keys in this node, indexed by key name. Map values are of type `XtkSchemaKey`
| **hasEnumeration** | Returns a boolean which indicates whether the value of the current node is linked to an enumeration.
| **childrenCount** | Number of children nodes
| **hasSQLTable** | Returns a boolean which indicates whether the current node is linked to an SQL table.
| **hasUserEnumeration** | Returns a boolean which indicates whether the value of the current node is linked to a user enumeration.
| **schema** | The schema (`XtkSchema`) to which this node belongs
| **isAdvanced** | Returns a boolean which indicates whether the current node is advanced or not.
| **isAnyType** | Returns a boolean which indicates whether the current node is ordinary.
| **isAttribute** | Indicates if the node is an attribute (true) or an element (false)
| **isAutoIncrement** | Returns a boolean which indicates whether the value of the current node is incremented automatically.
| **isAutoPK** | Returns a boolean which indicates whether the current node is a primary key.
| **isAutoUUID** | Yes | No | Returns a boolean which indicates whether the current node is an automatic UUID
| **isAutoStg** | Yes | No | Returns a boolean which indicates whether the schema is a staging schema
| **isBlob** | Returns a boolean which indicates whether the current node is a BLOB.
| **isCalculated** | Returns a boolean which indicates whether the value of the current node is the result of a calculation. Note that compute strings are not considered as calculated attributes.
| **isCDATA** | Returns a boolean which indicates whether the current node is mapped from CDATA type XML.
| **isCollection** | Returns a boolean which indicates whether the current node is a collection of sub-elements and/or attributes. This is an alias to `unbound` and `isUnbound` properties.
| **isDefaultOnDuplicate** | Returns a boolean. If the value added is vrai, during record deduplication, the default value (defined in defaultValue) is automatically reapplied during recording.
| **isElementOnly** | Returns a boolean which indicates whether the current node is a logical sub-division of the schema.
| **isExternalJoin** | True if the node is a link and if the join is external.
| **isLink** | Returns a boolean which indicates whether the node is a link.
| **isMappedAsXML** | Returns a boolean which indicates whether the node is an XML mapping.
| **isMemo** | Returns a boolean which indicates whether the current node is mapped by a Memo.
| **isMemoData** | Returns a boolean which indicates whether the current node is mapped by a MemoData.
| **isNotNull** | Returns a boolean which indicates whether or not the current node can take the null value into account.
| **isRequired** | Returns a boolean which indicates whether or not the value of the current node is mandatory.
| **isRoot** | Indicates if the node is the root node of a schema, i.e. the first child of the schema node, whose name matches the schema name
| **isSQL** | Returns a boolean which indicates whether the current node is mapped in SQL.
| **isTemporaryTable** | Returns a boolean indicating whether the table is a temporary table. The table will not be created during database creation.
| **unbound** | Returns a boolean which indicates whether the current node has an unlimited number of children of the same type.
| **joins** | Element of type "link" has an array of XtkJoin. See `joinNodes` method.
| **label** | The label (i.e. human readable, localised) name of the node.
| **name** | The name of the node (internal name)
| **nodePath**  | The xpath of the node
| **parent** | The parent node (a `XtkSchemaNode` object). Will be null for schema nodes
| **PKSequence** | Returns a character string that provides the name of the sequence to use for the primary key.
| **packageStatus** | Returns a number that gives the package status.
| **packageStatusString** |  Returns a string that gives the package status ("never", "always", "default", or "preCreate").
| **revLink** | Returns the name of the reverse link in the link target schema. See `reverseLink` method to get the actual reverse link object
| **SQLName** | The SQL name of the field. The property is an empty string if the object isn't an SQL type field.
| **SQLTable** | The SQL name of the table. The property is an empty string if the object isn't the main element or if schema mapping isn't of SQL type.
| **size** | For string nodes, the maximum length of the node value. Alias to `length`.
| **length** | For string nodes, the maximum length of the node value. Alias to `size`.
| **target** | A string corresponding to the target of a link. Note that in the SDK, this is a string, whereas in the JS API, this is the actual target node. Because the SDK is async. Use `linkTarget` to get the target node of a link.
| **type** | The data type of the node, for instance "string", "long", etc.
| **userEnumeration** | Returns a string of characters which is the name of the user enumeration used by the current node.
| **ref** | Some nodes are only references to other nodes. There are 2 kind of references. Local references are simply a xpath in the current schema (starting from the schema itself, and not the schema root). Fully qualified references are prefixed with a schema id. The target node can be accessed with the `refTarget` funtion.
| **isMappedAsXml** | Is the field mapped as XML?



| Method | Description |
|---|---|
| async **findNode** | Find a child node using a xpath. This function follows links and references if necessary and will dynamically fetch/cache necessary schemas. 
| async **refTarget** | Get the target node of a reference
| async **linkTarget** | Get the target node of a link. See `target`
| async **joinNodes** | Get the schema nodes corresponding to link. The function returns nodes for both the source and the destination of the link. See `joins`.
| async **reverseLink** | Returns the node corresponding to the reverse link of a link. See `revLink` to get the reverse link name rather than the actual node
| async **computeString** | Returns the compute string of a node, following references if necessary
| async **enumeration** | For nodes whose value is an enumeration, return the `XtkEnumeration` object corresponding to the enumeration definition. See `enum` property to get the enumeration name instead of the object
| **firstInternalKeyDef** | 
| **firstExternalKeyDef** |
| **firstKeyDef** |



### XtkSchemaKey

| Attribute/Method | Description |
|---|---|
| **schema** | The schema to which this key belongs
| **name** |  The name of the key (internal name)
| **label** | The label (i.e. human readable, localised) name of the key
| **description** | A long, human readable, description of the key
| **isInternal** | Indicates if the key is an internal key (as opposed to an external key)
| **allowEmptyPart** |
| **fields** | A ArrayMap of key fields making up the key. Each value is a reference to a `XtkSchemaNode` 

### XtkEnumeration

| Attribute/Method | Description |
|---|---|
| **name** |  The name of the enumeration, fully qualified, i.e. prefixed with the schema id
| **label** | The label (i.e. human readable, localised) name of the key
| **description** | A long, human readable, description of the key
| **baseType** | The base type of the enumeration, usually "string" or "byte"
| **default** | The default value of the enumeration, casted to the enumeration type
| **hasImage** | If the enumeration has an image
| **values** | A ArrayMap of enumeration values, of type `XtkEnumerationValue`

### XtkEnumerationValue

| Attribute/Method | Description |
|---|---|
| **name** |  The name of the key (internal name)
| **label** | The label (i.e. human readable, localised) name of the key
| **description** | A long, human readable, description of the key
| **image** |
| **enabledIf** |
| **applicableIf** |
| **value** | The value of the enumeration (casted to the proper Javascript type)

# Advanced Topics

## The EntityAccessor

An `EntityAccessor` provides a simple interface to access entity objects regardless of their representation. For instance, a query result may be a DOM Element, or a object literal, or a BadgerFish objet. Accessing attribute values and sub elements requires to know which representation is used and which representation specific API to call. For instance, to get the "name" attribute of an entity, you'll write:

* for Simple Json representation, access as JavaScript properties: entity.name or entity["name"]
* for the XML representation, use the DOM API: entity.DomUtil.getAttribute("name)"
* for Badget fish, access as JavaScript properties, but do not forget the "@" sign; entity["@name"]

Once done, you'll probably want to cast the value to an XTK type using the XtkCaster.

If you need to access entity attributes (or child elements) in a generic way, you can use the `EntityAccessor`. It has the following static methods:

* `getAttributeAsString`, `getAttributeAsLong`, `getAttributeAsBoolean` to get typed attribute values
* `getChildElements` to get the child elements. The result can be iterated on with a `for...of...` loop
* `getElement` to get a child element whose attributes and child elements can also be accessed by the EntityAccessor API

## Invoking SOAP calls dynamically
Soap calls can be invoked dynamically as follows

```js
  const namespace = client.NLWS["xtkSession"];
  const method = namespace["getOption"];
  const result = await method.call(namespace, parameters);
```

where parameters is the list of parameters to the SOAP call.
Parameters can be a function which can compute and return the list of parameters as the function is being called:

```js
  const result = await method.call(namespace, (method, callContext) => {
    return parameters;
  });
```
The `method` parameter is the XML definition of the SOAP method call. The `callContext` is an object which contains the following attributes:
* `schemaId` is the id of the schema containing the SOAP method
* `namespace` is the call namespace
* `object` is only used for non-static call and contains the "this" of the call.



# Build & Run

To build this project, you need node and npm

```sh
npm install
```

## Check and resolve any security issues
```sh
npm audit
npm audit fix --force
```

## Check if there are any code warnings
```sh
node_modules/jshint/bin/jshint src/
```

## Run tests
```sh
npm run unit-tests
```

## Build JavaScript documentation
```sh
npm run jsdoc
open ./docs/jsdoc/index.html
```

The HTML doc will be generated in the docs/ folder

## Deploy to npm

To deploy to npm
* Build and run tests locally
* Increase version in `package.json`
* Push a commit with message `Release 1.2.3` in master

| There's a publication action that will publish released automatically when there's a commit named "Release ..." in master AND the version matches the one in package.json
| Do not create a git tag for this version, the publication hook will take care of it. If you have created a tag with the release name, the publication will fail


# Client-side SDK
The SDK can also be used client side. 

## Compile the client-side SDK
Go to the root folder of the SDK and compile the SDK
````sh
node ./compile.js
````

It generates a file named `dist/bundle.js`
````
ACC client-side SDK compiler version 0.1.0
Bundling ../package.json
Bundling ./web/jsdom.js
Bundling ./web/crypto.js
Bundling ./web/request.js
Bundling ./xtkCaster.js
Bundling ./domUtil.js
Bundling ./xtkEntityCache.js
Bundling ./methodCache.js
Bundling ./optionCache.js
Bundling ./soap.js
Bundling ./crypto.js
Bundling ./client.js
Bundling ./index.js
Client-side SDK generated in ./dist/bundle.js
````

## Use a proxy
Using the client side SDK cannot be done directly because the Campaign server has CORS configured to reject HTTP requests from resources not served by Campaign. 
Therefore a server-side proxy is need to relay the calls to Campaign, or you need to serve the SDK and corresponding web pages from Campaign itself

## Deploy the SDK to a Campaign server
Once compiled, copy it to the Campaign server (here on a dev environment).
````sh
cd /c/cygwin64/home/neolane/ac
cp "Z:\amorin On My Mac\Documents\dev\git\ac7\acc-js-sdk\dist/bundle.js" nl/web/accSDK.js
````

This makes them available on the following endpoint
````
/nl/accSDK.js
````




## Usage

Include the SDK
```
<script src="accSDK.js"></script>
````

Use the SDK. Note that the SDK variable is now called `document.accSDK` to avoid potential name collision with the common name "sdk".
````
<script>

    (async () => {
        const sdk = document.accSDK;

        const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                "http://ffdamid:8080", "admin", "admin");
        const client = await sdk.init(connectionParameters);
  
        console.log(sdk.getSDKVersion());
        await client.logon();

        var databaseId = await client.getOption("XtkDatabaseId");
        console.log(databaseId);
        document.getElementById("hello").textContent = databaseId;

        await client.logoff();    
    })();

</script>
````



# Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

# Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
