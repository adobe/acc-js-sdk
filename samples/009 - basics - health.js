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
This sample illustrates how to call the various ping / health / ... PAIs

================================================================================================
`);

utils.run(async () => {
  await utils.attempt(async () => {
    var version = sdk.getSDKVersion();
    console.log(`>> ${version.description} version ${version.version}`);
    console.log(`Connecting anonymously to Campaign instance '${utils.url}'`);
    const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser(utils.url);
    const client = await sdk.init(connectionParameters);
  
    console.log(`\nThe application.test() method can be used to ping the instance (/r/test API)`);
    const test = await client.test();
    console.log(`>> Result: ${JSON.stringify(test)}`);  
  });

  console.log(`\nLogging in to Campaign for authenticated health methods`);
  await utils.logon(async (client) => {

    await utils.attempt(async () => {
      console.log(`\nCalling the ping API (/nl/jsp/ping.jsp)`);
      const ping = await client.ping();
      console.log(`>> Result: ${JSON.stringify(ping)}`);
    });
  
    await utils.attempt(async () => {
      console.log(`\nCalling the mcPing API (/nl/jsp/mcPing.jsp). Note: only available if Message Center is installed`);
      const mcPing = await client.mcPing();
      console.log(`>> Result: ${JSON.stringify(mcPing)}`);
    });
  });
});

