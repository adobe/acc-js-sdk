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
 * Samples for navigation APIs
 * 
 * xtkFolder.loadChildren function parameters
 *    {string} parentKey
 *    {string} folderFilter   optional filter on folders (serialized condition)
 *    {boolean} writeAccess   only return writable folders
 *    {string} fullName
 *    {boolean} sort          sort folders by label
 * 
 *********************************************************************************/
 const sdk = require('../src/index.js');
 const utils = require("./utils.js");
 
 utils.run(async () => {

  console.log(`================================================================================================
  This sample illustrates how to use message center API to send events

  - How to use the session token authentication mode for message center
  - How to use the nms:rtEvent#PushEvent API to send an event to Message Center
  - How to query the status of an event

  ================================================================================================
  `);

  const connectionParameters = sdk.ConnectionParameters.ofSessionToken(utils.rt1_url, "mc/mc");
  const client = await sdk.init(connectionParameters);
  const NLWS = client.NLWS;
  await client.logon();

  console.log(`Calling the message center API to push an event. Will return an event id. Although the event id looks like a number, it should be considered as an opaque string.`);
  var eventId = await NLWS.nmsRtEvent.pushEvent({
    wishedChannel: 0,
    type: "welcome",
    email: "aggmorin@gmail.com",
    ctx: {
      $firstName: "Alex"
    }
  });
  console.log(`>> Event id: ${eventId}`);

  

  console.log(`The event id can be used to get the status of an event. Note that this API is not meant to be used at scale, it's only there for testing purpose. This API will also not work if using multiple Message Center instances behind a load balancer.`)

  console.log("The eventId returned by the PushEvent API is a 64 bit number (returned as a string by the SDK). The high byte is the message center cell number, and the lower bytes represent the primary key of the event. To get the event, we need to remove the high byte (and this only works if there's a single execution cell)");
  // Clear high byte
  eventId = Number(BigInt(eventId) & BigInt("0xFFFFFFFFFFFFFF"));
  console.log(">> Event it (without high byte) " + eventId);

  var queryDef = {
    schema: "nms:rtEvent",
    operation: "get",
    select: {
        node: [
            { expr: "@id" },
            { expr: "@status" },
            //{ expr: "delivery" },
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

});