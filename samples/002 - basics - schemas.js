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

/* Basic samples illustrating how to manipulate schemas
 */


const utils = require("./utils.js");

( async () => {

  await utils.sample({
    title: "Get a schema in JSON form",
    labels: [ "Basics", "Schemas", "getSchema" ],
    description: `The client.getSchema will return a schema entity, in either xml or json (depending on the representation)`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const schema = await client.getSchema("xtk:option");
        console.log(`>> client.getSchema (current representation) : ${JSON.stringify(schema)}`);
      });
    }
  });


  await utils.sample({
    title: "Get a schema in XML form",
    labels: [ "Basics", "Schemas", "getSchema" ],
    description: `The second parameter of the getSchema function makes it possible to change the representation. For instance, we can get the schema in xml form`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const schema = await client.getSchema("xtk:option", "xml");
        console.log(`>> client.getSchema (xml) : ${client.DomUtil.toXMLString(schema)}`);
      });
    }
  });



  await utils.sample({
    title: "Get a source schema in JSON form",
    labels: [ "Basics", "Schemas", "getSchema", "xtk:session", "GetEntityIfMoreRecent" ],
    description: `nUse the xtk:session#GetEntityIfMoreRecent API to get the nms:rtEvent source schema. This does not use the cache at all and is not restricted to schemas. In the following example, we retrieve a source schema`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const schema = await client.getEntityIfMoreRecent("xtk:srcSchema", "nms:rtEvent");
        console.log(`>> client.getEntityIfMoreRecent : ${JSON.stringify(schema)}`);
      });
    }
  });


  await utils.sample({
    title: "Get enumeration values using a query",
    labels: [ "Basics", "Schemas", "xtk:queryDef", "ExecuteQuery", "Enumerations" ],
    description: `How to use a QueryDef to fetch enumeration values. In this example, we get enumeration values to return message center event types.`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const queryDef = {
          schema: "xtk:enumValue",
          operation: "select",
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" },
                  { expr: "@label" },
                  { expr: "@img" },
                  { expr: "@order" }
              ]
          },
          where: {
            condition: [
                { expr:`[enum/@name]='eventType'` }
            ]
          }
        } 
        const query = NLWS.xtkQueryDef.create(queryDef);
        const enumValues = await query.executeQuery();
        console.log(`>> ${JSON.stringify(enumValues)}`);
      });
    }
  });



  await utils.sample({
    title: "Get a schema, returning a JavaScript object",
    labels: [ "Basics", "Schemas", "getSchema", "Application" ],
    description: `A more programmatic way to use schema is via the application.getSchema function. This returns JavaScript objects wrapping the JSON or XML representation of the schema and mimmics the existing Campaign internal SDK : https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Schema.html`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const schema = await client.application.getSchema("nms:recipient");
        
        console.log(`Here's some information about the nms:recipient schema
        >> id: ${schema.id}
        >> namespace: ${schema.namespace}
        >> name: ${schema.name}
        >> root: ${schema.root.label}
        `);
        
        console.log("Let's explore the schema structure");
        const root = schema.root;
        
        function show(node, indent) {
          var s = `${indent}${node.label} (attribute=${node.isAttribute} name='${node.name}' type='${node.type}')\n`;
          Object.keys(node.children).forEach((name) => {
            s = s + show(node.children[name], indent + "    ");
          });
          return s;
        }
        
        console.log(`>> ${show(root, "")}`);
        
      });
    }
  });


})();

