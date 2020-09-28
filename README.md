# Adobe Campaign Classic (ACC) SDK in JavaScript (node.js and browser)

This is a node.js SDK for Campaign API. It exposes the Campaign API exactly like it is used inside Campaign using the NLWS notation.

# Changelog

### Version 0.1.4 - 0.1.18
Another attempt to publish to npm from github action

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




# API Basics

In order to call the API, you need to create a `Client` object

```js
const sdk = require('./src/index.js');

const client = await sdk.init("https://myInstance.campaign.adobe.com", "admin", "admin");
const NLWS = client.NLWS;
```

The NLWS object allows to dynamically perform SOAP calls on the targetted Campaign instance.

You can get version information about the SDK
```js
console.log(sdk.getSDKVersion());
```

## LogOn / LogOff
```js
    await client.logon();
```

```js
    await client.logoff();
```

## Calling static APIs
Static APIs are the easiest to call. Once you have a `NLWS` object and logon to the server, call a static API as followed

```js
    result = await NLWS.xtkSession.getServerTime();
    console.log(result);
```

where
* `xtkSession` is made of the namespace and entity to which the API applies. For instance `xtk:session` -> `xtkSession`
* `getServerTime` is the method name. In ACC, method names start with an upper case letter, but in JS SDK you can put it in lower case too.


## Parameter types

In Campaign, many method attributes are XML elements or documents, as well as many return types. It's not very easy to use in JavaScript, so the SDK supports automatic XML <=> JSON conversion. Of yourse, you can still use XML if you want.
We're using Badgerfish convention (http://www.sklar.com/badgerfish/) for the translation.

By default, JSON is used, but the representation can be changed as follow:
```js
client.representation = "xml";
client.representation = "json";
```

Here's an example of a queryDef in JSON

```
    const queryDef = {
        "@schema": "nms:extAccount",
        "@operation": "select",
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@name" }
            ]
        }
    };
```

## Returning multiple values
Campaign API can return one or multiple values. The SDK uses the following convention:
* no return value -> returns `null``
* one return value -> returns the value directly
* more that one return value -> returns an array of values


## Calling non-static APIs

To call a non-static API, you need an object to call the API on. You create an object with the `create` method.
For instance, here's how one creates a QueryDef object.

```js
    const queryDef = {
        "@schema": "nms:extAccount",
        "@operation": "select",
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@name" }
            ]
        }
    };
    const query = NLWS.xtkQueryDef.create(queryDef);
```

The method can then be called directly on the object
```js
    const extAccounts = await query.executeQuery();
```

In this example, the result is as follows

```js
{"extAccount":[
    {"@id":"2523379","@name":"cda_snowflake_extaccount"},
    {"@id":"1782","@name":"defaultPopAccount"},
    {"@id":"3643548","@name":"v8"}
]}
```


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

Create DOM from XML string:
```js
    const doc = DomUtil.parse("<root><one/></root>");
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

Find element by name (finds the first)
```js
    const el = DomUtil.findElement(parentElement, elementName, shouldThrow);
```

Get the text value of an elemenbt
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

Get typed attribute values
```js
    const stringValue = DomUtil.getAttributeAsString(element, attributeName)
    const byteValue = DomUtil.getAttributeAsByte(element, attributeName)
    const booleanValue = DomUtil.getAttributeAsBoolean(element, attributeName)
    const shortValue = DomUtil.getAttributeAsShort(element, attributeName)
    const longValue = DomUtil.getAttributeAsLong(element, attributeName)
```

JSON to XML conversion (badger fish)
```js
    const document = DomUtil.fromJSON(json);
    const json = DomUtil.toJSON(documentOrElement);
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

External account passwords can be decrypted using a Cipher.

```js
    const cipher = await client.getSecretKeyCipher();
    const password = cipher.decryptPassword(encryptedPassword);
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



## Connect to mid-sourcing
From a marketing client connection, one can get a client to a mid server

```js
    console.log("Connecting to mid server...");
    const midClient = await client.getMidClient();
    await midClient.client.logon();
    const datbaseId = await midClient.getOption("XtkDatabaseId");
    console.log("Mid datbaseId: " + datbaseId);
    await midClient.NLWS.xtkSession.testCnx();
    console.log("Disconnecting from mid");
    await midClient.client.logoff();
```

# Configuration

## Tracking all SOAP calls

SOAP calls can be logged by setting the `traceSOAPCalls` attribute on the client at any time.

```js
client.traceSOAPCalls = true;
```

This is an example of the logs
````
SOAP//request xtk:session#GetOption <SOAP-ENV:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://xml.apache.org/xml-soap"><SOAP-ENV:Header><Cookie>__sessiontoken=___3033D619-6710-450D-9194-CEB718D9F57B</Cookie><X-Security-Token>@p4IgqV7etc_liq15zAq59iYRLcCh6_tQkRC5WHbhIA8RTHkFt6VIc9R9RYA4NPwFcqtGh9-LmvrdplXgiiLWNA==</X-Security-Token></SOAP-ENV:Header><SOAP-ENV:Body><m:GetOption xmlns:m="urn:xtk:session" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><sessiontoken xsi:type="xsd:string">___3033D619-6710-450D-9194-CEB718D9F57B</sessiontoken><name xsi:type="xsd:string">XtkDatabaseId</name></m:GetOption></SOAP-ENV:Body></SOAP-ENV:Envelope>

SOAP//response xtk:session#GetOption <?xml version='1.0'?><SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'><SOAP-ENV:Body><GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'><pstrValue xsi:type='xsd:string'>uFE80000000000000F1FA913DD7CC7C4804BA419F</pstrValue><pbtType xsi:type='xsd:byte'>6</pbtType></GetOptionResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>
`````


# Query API

List all accounts
````
    const queryDef = {
        "@schema": "nms:extAccount",
        "@operation": "select",
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@name" }
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
                { "@expr": "@server" },
                { "@expr": "@provider" },
            ]
        },
        "where": {
            "condition": [
                { "@expr": "@name='ffda'" }
            ]
        }
    }
    const query = NLWS.xtkQueryDef.create(queryDef);
    const extAccount = await query.executeQuery();
```

## Pagination
Results can be retrieved in different pages, using the `@lineCount` and `@startLine` attributes. For instance, retrieves profiles 3 and 4 (skip 1 and 2)

```js
    var queryDef = {
        "@schema": "nms:recipient",
        "@operation": "select",
        "@lineCount": 2,
        "@startLine": 2,
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@email" }
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
    "@xtkschema": "xtk:image",
    "@_operation": "insert",
    "@namespace": "cus",
    "@name": "test.png",
    "@label": "Self test",
    "@type": "png",
    "data": { "$": data }
};
await NLWS.xtkPersist.write(doc);
````

Creates a folder (with image previously created)
```js
const folder = {
    "@xtkschema": "xtk:folder",
    "@_operation": "insert",
    "@parent-id": 1167,
    "@name": "testSDK",
    "@label": "Test SDK",
    "@entity": "xtk:folder",
    "@schema": "xtk:folder",
    "@model": "xtkFolder",
    "@image-namespace": "cus",
    "@image-name": "test.png"
};
await NLWS.xtkPersist.write(folder);
````

# Workflow API

Start and stop wotkflows, passing either an id or workflow internal name
```js
    await NLWS.xtkWorkflow.stop(4900);
    await NLWS.xtkWorkflow.start(4900);
```

A workflow can be started with parameters. Variables, are passed as attributes of the parameters document.
```js
await NLWS.xtkWorkflow.startWithParameters(4900, { "@hello": "world" });
```

The variables can be used in the workflow as attributes of the `instance.vars` variable.

```js
logInfo(instance.vars.hello);
```



# Profiles and subscriptions

Create a recipient
```js
    var recipient = {
        "@xtkschema": "nms:recipient",
        "@_operation": "insert",
        "@firstName": "Thomas",
        "@lastName": "Jordy",
        "@email": "jordy@adobe.com"
    };
    await NLWS.xtkPersist.write(recipient);
```

Create multiple recipients
```js
    var recipients = {
        "@xtkschema": "nms:recipient",
        "recipient": [
            {
                "@_operation": "insert",
                "@firstName": "Christophe",
                "@lastName": "Protat",
                "@email": "protat@adobe.com"
            },
            {
                "@_operation": "insert",
                "@firstName": "Eric",
                "@lastName": "Perrin",
                "@email": "perrin@adobe.com"
            }
        ]
    };
    await NLWS.xtkPersist.writeCollection(recipients);
```

List all recipients in Adobe
```js
    var queryDef = {
        "@schema": "nms:recipient",
        "@operation": "select",
        "select": {
            "node": [
                { "@expr": "@id" },
                { "@expr": "@firstName" },
                { "@expr": "@lastName" },
                { "@expr": "@email" }
            ]
        },
        "where": {
            "condition": [
                { "@expr": "GetEmailDomain(@email)='adobe.com'" }
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
        "@schema": "nms:recipient",
        "@operation": "count"
    }
    var query = NLWS.xtkQueryDef.create(queryDef);
    var count = await query.executeQuery();
    count = XtkCaster.asLong(count["@count"]);
    console.log(count);
```

Update a profile. In this case, use the "@email" attribute as a key. If the `@_key` attribute is not specified, the primary key will be used.
```js
    var recipient = {
        "@xtkschema": "nms:recipient",
        "@_key": "@email",
        "@_operation": "update",
        "@firstName": "Alexandre",
        "@email": "amorin@adobe.com"
    };
    await NLWS.xtkPersist.write(recipient);
```

Deletes a profile
```js
    var recipient = {
        "@xtkschema": "nms:recipient",
        "@_key": "@email",
        "@_operation": "delete",
        "@email": "amorin@adobe.com"
    };
    await NLWS.xtkPersist.write(recipient);
```

Deletes a set of profiles, based on condition. For instance delete everyone having an email address in adobe.com domain
```js
    await NLWS.xtkPersist.deleteCollection("nms:recipient", { condition: { "@expr": "GetEmailDomain(@email)='adobe.com'"} });
```

## Subscriptions

One can register a recipient to a service
```js
````



# Schemas

Reading schemas is a common operation in Campaign. The SDK provides a convenient function as well as caching for efficient use of schemas.

```js
    const schema = await client.getSchema("nms:recipient");
    console.log(JSON.stringify(schema));
```

A given representation can be forced
```js
    const xmlSchema = await client.getSchema("nms:recipient", "xml");
    const jsonSchema = await client.getSchema("nms:recipient", "json");
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

        const client = await accSDK.init("http://ffdamid:8080", "admin", "admin");
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
