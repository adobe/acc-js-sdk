/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { XtkCaster } = require("../src/xtkCaster.js");
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
        // Create a new delivery object
        const delivery = client.NLWS.nmsDelivery.create({ label: "Test #1", messageType: "0" });
        await delivery.newInstance();

        // At this point, the delivery has been given an id (delivery.entity.id) and is ready to
        // be persisted using client.NLWS.xtkSession.write or save
        // Optionally, attributes can be set/changed at this point
        delivery.$desc = "My description";
        
        // Now we're creating the delivery in the database
        await client.NLWS.xtkSession.write(delivery);

        // In order to update after creation, do not forget the "_operation=update" or the
        // call will fail or create a duplicate
        delivery._operation = "update";
        delivery.label = "Test #4";
        await delivery.save();

        // Finally delete the object
        delivery._operation = "delete";
        await delivery.save();    
      });
    }
  });
  
  await utils.sample({
    title: "Duplicate",
    labels: [ "xtk:persist", "Basics", "Duplicate", "CRUD" ],
    description: `The "Duplicate" method creates a new instance of an entity in memory by duplicating an existing instance`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {

        // Get the webApp operator id
        const query = NLWS.xtkQueryDef.create({
          schema: "xtk:operator", operation: "get",
          select: { node: [ { expr: "@id" } ] },
          where: { condition: [ { expr:`@name='webapp'` } ] }
        });
        const webAppOperator = await query.executeQuery();
        const webAppOperatorId = XtkCaster.asLong(webAppOperator.id);

        // Duplicate the webApp operator and name it 'alex'
        const operator = client.NLWS.xtkOperator.create();
        await operator.duplicate(`xtk:operator|${webAppOperatorId}`);
        operator.name = "alex";
        await operator.save();

        // Change the operator name to 'Alexandre'
        operator.entity.name = operator.entity.name + "andre";
        operator._operation = "update";
        await operator.save();
      });
    }
  });

  await utils.sample({
    title: "Create a recipient",
    labels: [ "xtk:persist", "Basics", "Write", "CRUD" ],
    description: `The "Write" method creates or updates an entity`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        await client.NLWS.xtkSession.write({ xtkschema:"nms:recipient", email: 'amorin@adobe.com' });
      });
    }
  });

  // Set recipient folder
  await utils.sample({
    title: "Set the folder of a recipient",
    labels: [ "xtk:persist", "Basics", "Write", "CRUD" ],
    description: `The "Write" method creates or updates an entity`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {

        // Reserve an id and create a recipient with this id
        const idList = XtkCaster.asArray(await client.NLWS.xtkSession.GetNewIdsEx(1, "XtkNewId"));
        console.log(`Reserved ids: ${idList}`);
        await client.NLWS.xtkSession.write({ xtkschema:"nms:recipient", id: idList[0], email: 'amorin@adobe.com' });

        // Move to default folder
        await client.NLWS.xtkSession.write({ 
          xtkschema:"nms:recipient", 
          id: idList[0], _operation:"update", 
          folder: {
            _operation: "none",
            name: "nmsRootRecipient"
          }
        });
      });
    }
  });

  // Update folder label by key
  await utils.sample({
    title: "Update folder label",
    labels: [ "xtk:persist", "Basics", "Write", "CRUD" ],
    description: `The "Write" method creates or updates an entity`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {

        // Create a folder
        const name = 'acc_js_sdk_005';
        console.log(`Creating a test folder with internal name '${name}'`);
        const folder = client.NLWS.xtkFolder.create()
        folder.name = name;
        folder.label = 'Test folder for the ACC JS SDK (sample #5)';
        await folder.save();

        // Modify the folder label
        console.log(`Modifying the folder label`);
        await client.NLWS.xtkSession.write({ 
          xtkschema: "xtk:folder", 
          _operation: "update", name: name,
          label: "Hello World",
        });

        // Loading the folder again
        // Notice that changing the label has also triggered a change of the full name
        const query = NLWS.xtkQueryDef.create({
          schema: "xtk:folder", operation: "get",
          select: { node: [ { expr: "@id" }, { expr: "@name" }, { expr: "@label" }, { expr: "@fullName" } ] },
          where: { condition: [ { expr:`@name='${name}'` } ] }
        });
        const databaseFolder = await query.executeQuery();
        console.log(`>> databaseFolder: ${JSON.stringify(databaseFolder)}`);

        // Delete the folder
        await client.NLWS.xtkSession.write({ xtkschema: "xtk:folder", _operation: "delete", name: name });
      });
    }
  });
  
})();

