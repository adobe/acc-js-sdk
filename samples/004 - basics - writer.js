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

const utils = require("./utils.js");

utils.logon(async (client, NLWS) => {

  console.log(`================================================================================================
This sample illustrates how to call the writer API to create, update and delete individual rows or small collections of rows

================================================================================================
`);
/*
console.log("Let's start by creating a recipient.");
var recipient = {
  xtkschema: "nms:recipient",
  _operation: "insert",
  firstName: "Alex",
  lastName: "Morin",
  email: "amorin@adobe.com"
};
await NLWS.xtkSession.write(recipient);
console.log(`>> recipient was created, but the function does not return anything`);

*/

console.log("\nThe challenge here is that it's not returning a PK so we don't know which recipient has been created. This can be mitigated by using an alternate business key (ex: customerId, email...) or by calling the xtk:session#GetNewIdsEx function to pre-generate an id. The latter only works in V7 and will not work on V8. Each call to GetNewIdsEx will actually do a server call and will reserve ids from the PostgreSQL sequence. When insering many rows, it's best practice to pre-allocate as much ids as possible. On the other hand, we inserting only one row, only pre-allocate one id as shown below.");
console.log("The sequence used for recipients is normally NmsRecipientId, but it can be XtkNewId for older builds. Not using the right sequence can cause issues such as duplicate key errors");
for (var i=0; i<20; i++) {
  const ids = await NLWS.xtkSession.getNewIdsEx(1, "NmsRecipientId");
  console.log(`>> Pre-allocated ids: ${ids}`);
}
/*
console.log("Creating or updating the recipient by primary key. Note the usage of 'insertOrUpdate' operation");
var recipient = {
  xtkschema: "nms:recipient",
  _operation: "insertOrUpdate",
  _key: "@id",
  id: ids[0],
  firstName: "Alex",
  lastName: "Morin",
  email: "amorin@adobe.com"
};
await NLWS.xtkSession.write(recipient);
console.log(`>> recipient was created, but the function does not return anything`);

console.log("We can now update the recipient. We only need to pass to id and the fields to update.");
var recipient = { xtkschema: "nms:recipient", _operation: "insertOrUpdate", _key: "@id", id: ids[0], firstName: "Alexandre" };
var result = await NLWS.xtkSession.write(recipient);
console.log(`>> recipient was updated, but the function does not return anything ${result}`);
*/

});



/*
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
*/