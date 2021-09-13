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
const sdk = require('../src/index.js');
const utils = require("./utils.js");


console.log(`================================================================================================
This sample illustrates how to call the various ping / health / ... APIs

================================================================================================
`);

( async () => {

  await utils.sample({
    title: "Testing if the redirection server is up (/r/test)",
    labels: [ "Basics", "Health", "Ping", "Test" ],
    description: `The application.test() method can be used to ping the instance (/r/test API)`,
    code: async() => {
      console.log(`Connecting anonymously to Campaign instance '${utils.url}'`);
      const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser(utils.url);
      const client = await sdk.init(connectionParameters);
      const test = await client.test();
      console.log(`>> Result: ${JSON.stringify(test)}`);  
    }
  });


  await utils.sample({
    title: "Calling the 'ping' JSP",
    labels: [ "Basics", "Health", "Ping" ],
    description: `Calling the ping API (/nl/jsp/ping.jsp)`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const ping = await client.ping();
        console.log(`>> Result: ${JSON.stringify(ping)}`);
      });
    }
  });


  await utils.sample({
    title: "Calling the Message Center ping API",
    labels: [ "Basics", "Health", "Ping", "MessageCenter", "MC", "McPing" ],
    description: `nCalling the mcPing API (/nl/jsp/mcPing.jsp). Note: only available if Message Center is installed`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        if (client.application.hasPackage("nms:messageCenter")) {
          const mcPing = await client.mcPing();
          console.log(`>> Result: ${JSON.stringify(mcPing)}`);
        }
        else {
          console.log("Message Center not insalled. mcPing API is not available");
        }
      });
    }
  });


})();

