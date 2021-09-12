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

( async () => {

  await utils.sample({
    title: "Query a single record",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "ExecuteQuery" ],
    description: `The "get" operation to query a single record that must exist (will throw if it doesn't)`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log("This query will return a single target mapping (mapRecipient) and display some of its attributes. The 'get' operation ensures that the query returns exactly one record and fails if the data is not found.");
    
        const  queryDef = {
          schema: "nms:deliveryMapping",
          operation: "get",
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" },
                  { expr: "@label" },
                  { expr: "@schema" }
              ]
          },
          where: {
            condition: [
                { expr:`@name='mapRecipient'` }
            ]
          }
        }
      
        // The following code illustrates how to add conditional attributes based on whether a package is installed or not
        if (client.application.hasPackage("nms:social")) {
          queryDef.select.node.push({ expr: "@facebook" });
        }
        if (client.application.hasPackage("nms:mobileApp")) {
          queryDef.select.node.push({ expr: "@blackListAndroid" });
        }
      
        // Get the target mapping and display it
        const  query = NLWS.xtkQueryDef.create(queryDef);
        const mapRecipient = await query.executeQuery();
        console.log(`>> mapRecipient: ${JSON.stringify(mapRecipient)}`);
      });
    }
  });

  await utils.sample({
    title: "Query a set of records",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Select", "ExecuteQuery" ],
    description: `The "select" operation to query a list of records`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log("\nIllustrating the 'select' operation in a query which will return a list of records (javaScript array).");
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
        console.log(`>> mappings: ${JSON.stringify(mappings)}`);
      });
    }
  });

  await utils.sample({
    title: "Query a single record (which may not exist)",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "ExecuteQuery" ],
    description: `The "getIfExist" operation to query a single record and return null if it does not exist`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log("\nThe 'getIfExists' operation will return 'null' when the requested record does not exist.");
        const queryDef = {
          schema: "nms:deliveryMapping",
          operation: "getIfExists",
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" }
              ]
            },
            where: {
              condition: [
                  { expr:`@name='mapNotFound'` }
              ]
            }  
        };
        const query = NLWS.xtkQueryDef.create(queryDef);
        const mapNotFound = await query.executeQuery();
        console.log(`>> mapNotFound: ${mapNotFound}`);        // will display "null"
      });
    }
  });


  await utils.sample({
    title: "Query and pagination",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "OrderBy", "LineCount", "StartLine", "ExecuteQuery" ],
    description: `Illustrating how to do pagination with the 'select' operation and 'orderBy' clause. 
    The 'lineCount' attribute determines the max number of rows returned by the query. And the 'startLine' attribute the row number to start from (first row is line 0)
    This also illustrates how to use an orderBy clause to sort the result`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        var queryDef = {
          schema: "nms:deliveryMapping",
          operation: "select",
          lineCount: 2,
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" }
              ]
          },
          orderBy: { node: [
            {expr: "@name"}
          ]}
        };
        var query = NLWS.xtkQueryDef.create(queryDef);
        var page = await query.executeQuery();
        console.log(`>> mappings (page 1): ${JSON.stringify(page)}`);
        
        queryDef = {
          schema: "nms:deliveryMapping",
          operation: "select",
          lineCount: 2,
          startLine: 2,
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" }
              ]
          },
          orderBy: { node: [
            {expr: "@name"}
          ]}
        };
        query = NLWS.xtkQueryDef.create(queryDef);
        page = await query.executeQuery();
        console.log(`>> mappings (page 2): ${JSON.stringify(page)}`);
      });
    }
  });


  await utils.sample({
    title: "Select all fields of a query",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "SelectAll", "ExecuteQuery" ],
    description: `The 'selectAll' function allows to return all attributes. In this example, we'll get all attributes of the XtkDatabaseId option.
    This call is an actual SOAP call which returns a new query object`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
          const queryDef = {
            schema: "xtk:option",
            operation: "get",
            where: {
              condition: [
                  { expr:`@name='XtkDatabaseId'` }
              ]
            }
          }
          const query = NLWS.xtkQueryDef.create(queryDef);
          await query.selectAll(false);
          var databaseId = await query.executeQuery();
          console.log(`>> XtkDatabaseId (query with all attributes): ${JSON.stringify(databaseId)}`);        
      });
    }
  });


  await utils.sample({
    title: "Generate the SQL of a query",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "BuildQuery", "BuildQueryEx", "ExecuteQuery" ],
    description: `The queryDef API also lets you generate the SQL for a query, using the BuildQuery or BuildQueryEx methods. The latter will return the SQL and also metadata (data type) about each select field`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const queryDef = {
          schema: "nms:deliveryMapping",
          operation: "get",
          select: {
              node: [
                  { expr: "@id" },
                  { expr: "@name" },
                  { expr: "@label" },
                  { expr: "@schema" }
              ]
          },
          where: {
            condition: [
                { expr:`@name='mapRecipient'` }
            ]
          }
        }
      
        const query = NLWS.xtkQueryDef.create(queryDef);
      
        console.log(`The xtk:queryDef#BuildQuery API returns the SQL that a query would generate if it were executed`);
        var sql = await query.buildQuery();
        console.log(">> SQL query: " + sql);
      
        console.log(`The xtk:queryDef#BuildQueryEx API returns the SQL that a query would generate if it were executed and a format string for the returned select fields`);
        sql = await query.buildQueryEx();
        console.log(`>> SQL queryEx: "${sql[0]}"`);
        console.log(`>> Format string: "${sql[1]}"`);
      });
    }
  });


  await utils.sample({
    title: "Query analyze option",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "ExecuteQuery", "Analyze" ],
    description: `This query uses the 'analyze' option to return user friendly names for enumerations. 
    In this example, we use the exclusionType attribute of the target mappings schema. Without the analyze flag, the query will
    return the numeric value of the attribute (for example 2). With the flag, the query will still return the numeric value,
    but will also return the string value of the attribute and its label. It will use addition JSON attributes named
    "exclusionTypeName" and "exclusionTypeLabel", using the "Name" and "Label" suffixes.`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
          var queryDef = {
            schema: "nms:deliveryMapping",
            operation: "get",
            select: {
                node: [
                    { expr: "@id" },
                    { expr: "@name" },
                    { expr: "[storage/@exclusionType]" },
                    { expr: "@schema" }
                ]
            },
            where: {
              condition: [
                  { expr:`@name='mapRecipient'` }
              ]
            }
          }
          var query = NLWS.xtkQueryDef.create(queryDef);
          var mapping = await query.executeQuery();
          console.log(`>> Recipient target mapping without the analyze flag: ${JSON.stringify(mapping)}`);
        
          queryDef.select.node[2] = { expr: "[storage/@exclusionType]", analyze: true };
          query = NLWS.xtkQueryDef.create(queryDef);
          mapping = await query.executeQuery();
          console.log(`>> Recipient target mapping with the analyze flag: ${JSON.stringify(mapping)}`);        
      });
    }
  });


  await utils.sample({
    title: "Query a single record",
    labels: [ "xtk:queryDef", "Basics", "Query", "QueryDef", "Get", "ExecuteQuery", "Alias" ],
    description: `This example shows how to use aliases to control the structure of the output JSON. Without aliases, the output document structure will match
    the structure of the select nodes. In the following example, the exclusionType attribute will be moved to the root node of the result`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        var queryDef = {
            schema: "nms:deliveryMapping",
            operation: "get",
            select: {
                node: [
                    { expr: "@id" },
                    { expr: "@name" },
                    { expr: "[storage/@exclusionType]" },
                    { expr: "@schema" }
                ]
            },
            where: {
              condition: [
                  { expr:`@name='mapRecipient'` }
              ]
            }
          }
          
        var query = NLWS.xtkQueryDef.create(queryDef);
        var mapping = await query.executeQuery();
        console.log(`>> Recipient target mapping without aliases: ${JSON.stringify(mapping)}`);
      
        queryDef.select.node[2] = { expr: "[storage/@exclusionType]", alias: "@exclusionType" },
        query = NLWS.xtkQueryDef.create(queryDef);
        mapping = await query.executeQuery();
        console.log(`>> Recipient target mapping with an alias: ${JSON.stringify(mapping)}`);        
      });
    }
  });

})();

