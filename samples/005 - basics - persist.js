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

/**
 * Basic samples illustrating the xtk:persist interface
 */

( async () => {

  await utils.sample({
    title: "NewInstance",
    labels: [ "xtk:persist", "Basics", "NewInstance", "CRUD" ],
    description: `The "NewInstance" method creates a new instance of an entity in memory`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {

        const delivery = client.NLWS.nmsDelivery.create({ label: "Test #1", messageType: "0" });
        await delivery.newInstance();

        const ctx = delivery['.'];
        const p = delivery.__xtkProxy;

        await client.NLWS.xtkSession.write(delivery);
      });
    }
  });
})();

