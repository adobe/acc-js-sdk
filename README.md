# Adobe Campaign Classic (ACC) SDK in JavaScript

The ACC JavaScript SDK is a JavaScript SDK which allows you to call Campaign APIs in a simple, expressive and JavaScript idiomatic way. It hides away the Campaign complexities associated with having to make SOAP calls, XML to JSON conversion, type formatting, etc.

The API is fully asynchronous using promises and works as well on the server side than on the client side in the browser.



> **Extensive documentation is available**: https://opensource.adobe.com/acc-js-sdk/


# Prerequisites

The SDK requires **Node.js version 20** or above.

# QuickStart


To install the SDK, use your favorite node command
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
  version: "1.2.0",
  name: "@adobe/acc-js-sdk",
  description: "ACC Javascript SDK",
}
```


# An example
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
ACC Javascript SDK version 1.2.0
Target mappings: {"deliveryMapping":[{"id":"1747","label":"Recipients","name":"mapRecipient","schema":"nms:recipient"},{"id":"1826","label":"Subscriptions","name":"mapSubscribe","schema":"nms:subscription"},{"id":"1827","label":"Operators","name":"mapOperator","schema":"xtk:operator"},{"id":"1828","label":"External file","name":"mapAny","schema":""},{"id":"1830","label":"Visitors","name":"mapVisitor","schema":"nms:visitor"},{"id":"2035","label":"Real time event","name":"mapRtEvent","schema":"nms:rtEvent"},{"id":"2036","label":"Batch event","name":"mapBatchEvent","schema":"nms:batchEvent"},{"id":"2070","label":"Subscriber applications","name":"mapAppSubscriptionRcp","schema":"nms:appSubscriptionRcp"}]}
````




# Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

# Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
