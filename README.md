# Adobe Campaign Classic (ACC) SDK in JavaScript (node.js and browser)

This is a node.js SDK for Campaign API. It exposes the Campaign API exactly like it is used inside Campaign using the NLWS notation.

# Change log

See the [Change log](./CHANGELOG.md) for more information about the different versions, changes, etc.

# Overview

The ACC JavaScript SDK is a JavaScript SDK which allows you to simply call Campaign APIs in a simple, expressive and JavaScript idiomatic way. It hides away the Campaign complexities associated with having to make SOAP calls, XML to JSON conversion, type formatting, etc.

The API is fully asynchronous using promises and works as well on the server side than on the client side in the browser.

The SDK entrypoint is the `sdk` object from which everything else can be created.

```js
const sdk = require('./src/index.js');
```

You can get version information about the SDK
```js
console.log(sdk.getSDKVersion());
```



# API Basics

In order to call any Campaign  API, you need to create a `Client` object first. You pass it the Campaign URL, as well as your credentials. 

```js
const sdk = require('./src/index.js');
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

```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "admin",
                                    { representation: "xml", rememberMe: true });
```

## Login with IMS

The SDK also supports IMS service token with the `ofUserAndServiceToken` function. Pass it a user to impersonate and the IMS token.
```js
const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                                    "https://myInstance.campaign.adobe.com", 
                                    "admin", "==ims_service_token_here");
```

## Login with Session token

Campaign supports authenticating with a session token in some contexts. This is usually used for Message Center API calls (see the "Message Center" section below).

In this example, the session token is a string composed of the user name, a slash sign, and the password (often empty)

```js
const connectionParameters = sdk.ConnectionParameters.ofSessionToken(utils.rt1_url, "mc/mc");
```

Note that this authentication mode is very specific and does not actually performs a Logon: the passed session token will be passed to each API calls (with an empty security token) and requires proper setup of the security zones.
Another consequence is that the Application object will not be availeble in this case either.


## Anonymous logon

Several Campaign APIs are anonymous, i.e. do not require to actually logon to be used. For instance the "/r/test" API is anonymous. The SDK supports anonymous APIs but still need to be initialized with anonymous credentials as follows. Of course, anonymous APIs also work if you are logged on with a different method.

```js
const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser(url);
const client = await sdk.init(connectionParameters);
```


## LogOn / LogOff

The `sdk.init` call will not actually connect to Campaign, you can call the `logon` method for this.

```js
await client.logon();
```

```js
await client.logoff();
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

## SimpleJson format
The Simple JSON format works like this:

The XML root element tag is determined by the SDK as it's generating the XML, usually from the current schema name.

* XML: `<root/>`
* JSON: `{}`

XML attributes are mapped to JSON attributes with the same name, whose litteral value can be a string, number, or boolean. There's no "@" sign in the JSON attribute name.
Values in JSON attributes can be indifferently typed (ex: number, boolean), or strings (ex: "3" instead of just 3) depending if the conversion could determine the attribute type or not. 
API users should expect and handle both value and use the `XtkCaster` object to ensure proper conversion when using.

* XML: `<root hello="world" count=3 ok=true/>`
* JSON: `{ hello:"world", count:3, ok:true }`

XML elements are mapped to JSON objects

* XML: `<root><item id=1/></root>`
* JSON: `{ item: { id:1 } }`

If the parent element tag ends with `-collecion` children are always an array, even if there are no children, or if there is just one child. The rationale is that XML/JSON conversion is ambigous : XML can have multiple elements with the same tag and when there's only one such element, it's not possible to determine if it should be represented as a JSON object or JSON array unless we have additional metadata. 

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
* XML: `<root><item>Hello<child id="1"/></item></root>`
* JSON: `{ item: { $: "Hello", child: { id:1 } }`


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
````


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

## Error Management

If an API call fails (SOAP fault or HTTP error), a `CampaignException` object is thrown. This object contains the following attributes

* `message` a message describing the error
* `stack` the stack trace
* `statusCode` a HTTP status code. In case of a SOAP fault, the status code will be 500
* `errorCode` the Campaign error code if one is available (ex: XSV-350013)
* `methodCall` the SOAP call which caused the error. It will contain the following attributes
    * `type` the type of the API call ("SOAP" or "HTTP")
    * `urn` the SOAP call URN, i.e. the schema id. Will be empty for HTTP methods
    * `methodName` the name of the SOAP method. For HTTP methods, the query path
    * `request` the raw SOAP request, as text. For HTTP requests, this is an option object containing details about the request
    * `response` the raw SOAP/HTTP response, as text
* `faultCode` for SOAP faults, the Campaign error code
* `faultString` the error message
* `detail` optional additional details about the error

```js
  try {
    await client.logon();
    result = await NLWS.xtkSession.getServerTime();
  } catch (ex) {
    console.log(ex.message);
  }

```

## Caches

The following caches are manage by the SDK

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


## Passwords

External account passwords can be decrypted using a Cipher. This function is deprecated since version 1.0.0 since it's not guaranteed to work in future versions of Campaign (V8 and above)

```js
const cipher = await client.getSecretKeyCipher();
const password = cipher.decryptPassword(encryptedPassword);
````

> **warning** This function is deprecated in version 1.0.0 of the SDK because it may break as we deploy Vault.


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


# Configuration

## Tracking all SOAP calls

SOAP calls can be logged by setting the `traceSOAPCalls` attribute on the client at any time.

```js
client.traceSOAPCalls = true;
```

This is an example of the logs
````
SOAP//request xtk:session#GetOption <SOAP-ENV:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:ns="http://xml.apache.org/xml-soap">
<SOAP-ENV:Header>
    <Cookie>__sessiontoken=___3033D619-6710-450D-9194-CEB718D9F57B</Cookie>
    <X-Security-Token>@p4IgqV7etc_liq15zAq59iYRLcCh6_tQkRC5WHbhIA8RTHkFt6VIc9R9RYA4NPwFcqtGh9-LmvrdplXgiiLWNA==</X-Security-Token>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
    <m:GetOption xmlns:m="urn:xtk:session" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <sessiontoken xsi:type="xsd:string">___3033D619-6710-450D-9194-CEB718D9F57B</sessiontoken>
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
const connectionParameters = sdk.ConnectionParameters.ofSessionToken(utils.rt1_url, "mc/mc");
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
| buildNumber | The server build number
| instanceName | The name of the Campaign instance
| operator | Information about the current operator (i.e. logged user), of class `CurrentLogin`
| packages | List of installed packages, as an array of strings
| getSchema(schemaId) | Get a schema by id (see the Schemas section below)
| hasPackage(name) | Tests if a package is installed or not


The `CurrentLogin` object has the following attributes / functions

| Attribute/Method | Description |
|---|---|
| id | the internal id (int32) of the operator
| login | the login name of the operator
| computeString | A human readable name for the operator
| timezone | The timezone of the operator
| rights | An array of strings describing the rights of the operators

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
* There could be slight differences in usage due to Campaign server side JavaScript using some E4X specific constructs to iterate over collections (ex: for each(...)) which are not available in standard JavaScript environments

The entry point is the application object. Obtain a schema from its id:

```js
const application = client.application;
const schema = application.getSchema("nms:recipient");
```

This return a schema object of class `XtkSchema`


### XtkSchema / XtkSchemaNode

| Attribute/Method | | Description |
|---|---|---|
| schema | | The schema to which this node belongs
| id | schema | For schemas, the id of the schema. For instance "nms:recipient"
| namespace | schema | For schemas, the namespace of the schema. For instance "nms"
| name |  | The name of the node (internal name)
| label | | The label (i.e. human readable, localised) name of the node.
| labelSingular | schema | The singular label (i.e. human readable, localised) name of the schema. The label of a schema is typically a plural.
| description | | A long, human readable, description of the node
| img | | The name of the image (if any) corresponding to the node
| type | | The data type of the node, for instance "string", "long", etc.
| length | | For string nodes, the maximum length of the node value
| ref | |
| isAttribute | | Indicates if the node is an attribute (true) or an element (false)
| children | | A map of children of the node, indexed by name. Names never contain the "@" sign, even attribute names
| childrenCount | | Number of children nodes
| parent | | The parent node. Will be null for schema nodes
| isRoot | | Indicates if the node is the root node of a schema, i.e. the first child of the schema node, whose name matches the schema name
| userDescription | |
| keys | | A map of keys in this node, indexed by key name. Map values are of type `XtkSchemaKey`
| nodePath  | | The absolute full path of the node
| hasChild(name) | | Tests if the node has a child wih the given name
| findNode(path) | Find a child node using a xpath
| isLibrary | schema | For schemas, indicates if the schema is a library
| mappingType | schema | Schema mapping type. Usually "sql"
| xml | schema | The XML (DOM) corresponding to this schema
| root | schema | The schema root node, if there is one. A reference to a `XtkSchemaNode`
| enumerations | schema | Map of enumerations in this schema, indexed by enumeration name. Values are of type `XtkEnumeration`


### XtkSchemaKey

| Attribute/Method | Description |
|---|---|
| schema | The schema to which this key belongs
| name |  The name of the key (internal name)
| label | The label (i.e. human readable, localised) name of the key
| description | A long, human readable, description of the key
| isInternal |
| allowEmptyPart |
| fields | A map of key fields making up the key. Each value is a reference to a `XtkSchemaNode` 

### XtkEnumeration

| Attribute/Method | Description |
|---|---|
| name |  The name of the key (internal name)
| label | The label (i.e. human readable, localised) name of the key
| description | A long, human readable, description of the key
| baseType | 
| default |
| hasImage |
| values | A map of enumeration values, by name of value. Value is of type `XtkEnumerationValue`

### XtkEnumerationValue

| Attribute/Method | Description |
|---|---|
| name |  The name of the key (internal name)
| label | The label (i.e. human readable, localised) name of the key
| description | A long, human readable, description of the key
| image |
| enabledIf |
| applicableIf |
| value | The value of the enumeration (casted to the proper Javascript type)

# Advanced Topics

## The EntityAccessor


# Build & Run

To build this project, you need node and npm

````
npm install
````

## Deploy to npm

To deploy to npm
* Build and run tests locally
* Increase version in `package.json`
* Push a commit with message `Release 1.2.3`


# Client-side SDK
The SDK can also be used client side. 

## Compile the client-side SDK
Go to the root folder of the SDK and compile the SDK
````sh
node compile.js
````

It generates a file named `bundle.js`
````
ACC client-side SDK compiler version 0.1.0
Bundling ../package.json
Bundling ./web/jsdom.js
Bundling ./web/crypto.js
Bundling ./web/request.js
Bundling ./xtkCaster.js
Bundling ./dom.js
Bundling ./xtkEntityCache.js
Bundling ./methodCache.js
Bundling ./optionCache.js
Bundling ./soap.js
Bundling ./crypto.js
Bundling ./client.js
Bundling ./index.js
Client-side SDK generated in ./bundle.js
````

## Deploy the SDK
Once compiled, copy it to the Campaign server (here on a dev environment).
````sh
cd /c/cygwin64/home/neolane/ac
cp "Z:\amorin On My Mac\Documents\dev\git\ac7\acc-js-sdk\bundle.js" nl/web/accSDK.js
cp "Z:\amorin On My Mac\Documents\dev\git\ac7\acc-js-sdk\index.html" nl/web/index.html
````

This makes them available on
````
/nl/accSDK.js
````


## Usage

Include the SDK
```
<script src="accSDK.js"></script>
````

Use the SDK
````
<script>

    (async () => {
        const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(
                "http://ffdamid:8080", "admin", "admin");
        const client = await sdk.init(connectionParameters);
  
        console.log(accSDK.getSDKVersion());
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
