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
This sample illustrates how to execute Campaign queries using the QueryDef API

- How to use the "get" operation to query a single record that must exist (will throw if it doesn't)
- How to use the "select" operation to query a list of records
- How to use the "getIfExist" operation to query a single record and return null if it does not exist
- How to use the "select" operation with "lineCount" to do pagination

================================================================================================
`);

  console.log("This query will return a single target mapping (mapRecipient) and display some of its attributes. The 'get' operation ensures that the query returns exactly one record and fails if the data is not found.");
    
  var queryDef = {
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
  var query = NLWS.xtkQueryDef.create(queryDef);
  const mapRecipient = await query.executeQuery();
  console.log(`>> mapRecipient: ${JSON.stringify(mapRecipient)}`);



  console.log("\nIllustrating the 'select' operation in a query which will return a list of records (javaScript array).");
  var queryDef = {
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
  query = NLWS.xtkQueryDef.create(queryDef);
  const mappings = await query.executeQuery();
  console.log(`>> mappings: ${JSON.stringify(mappings)}`);



  console.log("\nThe 'getIfExists' operation will return 'null' when the requested record does not exist.");
  var queryDef = {
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
  query = NLWS.xtkQueryDef.create(queryDef);
  const mapNotFound = await query.executeQuery();
  console.log(`>> mapNotFound: ${mapNotFound}`);        // will display "null"



  console.log(`\nIllustrating how to do pagination with the 'select' operation and 'orderBy' clause. 
The 'lineCount' attribute determines the max number of rows returned by the query. And the 'startLine' attribute the row number to start from (first row is line 0)
This also illustrates how to use an orderBy clause to sort the result`);
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
  query = NLWS.xtkQueryDef.create(queryDef);
  var page = await query.executeQuery();
  console.log(`>> mappings (page 1): ${JSON.stringify(page)}`);
  
  var queryDef = {
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
  var page = await query.executeQuery();
  console.log(`>> mappings (page 2): ${JSON.stringify(page)}`);



  console.log(`
The 'selectAll' function allows to return all attributes. In this example, we'll get all attributes of the XtkDatabaseId option.
This call is an actual SOAP call which returns a new query object`);
  var queryDef = {
    schema: "xtk:option",
    operation: "get",
    where: {
      condition: [
          { expr:`@name='XtkDatabaseId'` }
      ]
    }
  }
  var query = NLWS.xtkQueryDef.create(queryDef);
  await query.selectAll(false);
  var databaseId = await query.executeQuery();
  console.log(`>> XtkDatabaseId (query with all attributes): ${JSON.stringify(databaseId)}`);



  console.log(`
The queryDef API also lets you generate the SQL for a query, using the BuildQuery or BuildQueryEx methods. The latter will return the SQL and also metadata (data type) about each select field`);

  var queryDef = {
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

  var query = NLWS.xtkQueryDef.create(queryDef);

  console.log(`The xtk:queryDef#BuildQuery API returns the SQL that a query would generate if it were executed`);
  var sql = await query.buildQuery();
  console.log(">> SQL query: " + sql);

  console.log(`\nThe xtk:queryDef#BuildQueryEx API returns the SQL that a query would generate if it were executed and a format string for the returned select fields`);
  var sql = await query.buildQueryEx();
  console.log(`>> SQL queryEx: "${sql[0]}"`);
  console.log(`>> Format string: "${sql[1]}"`);
});
