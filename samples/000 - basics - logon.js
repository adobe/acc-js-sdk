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

utils.run(async () => {

  console.log(`================================================================================================
This sample illustrates how to connect to a Campaign instance and the following aspects of the SDK

- How to display the SDK version
- How to create a "ConnectionParameters" object and logon to Campaign using a user and password
- How to access metadata about the instance and logged user
- How to access to Campaign options (getting and setting options)
- How to get the server date and time
- How to log off to Campaign instance
================================================================================================
`);

  var version = sdk.getSDKVersion();
  console.log(`>> ${version.description} version ${version.version}`);
  console.log(`Connecting to Campaign instance '${utils.url}' with user '${utils.user}'`);
  const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(utils.url, utils.user, utils.password);
  const client = await sdk.init(connectionParameters);
  const NLWS = client.NLWS;

  await client.logon();
  console.log("\nConnected to Campaign instance. The application object contains some information about the instance and logged user");
  console.log(`>> Is logged?  '${client.isLogged()}'`)
  console.log(`>> Instance name '${client.application.instanceName}'`)
  console.log(`>> Build number '${client.application.buildNumber}'`)
  console.log(`>> Installed packages '${client.application.packages}'`)
  console.log(`>> Is the FDA package installed? -> ${client.application.hasPackage("nms:federatedDataAccess")}`)

  console.log(`\nThe application.operator object contains information about the current user`);
  console.log(`>> Current operator id '${client.application.operator.id}'`);
  console.log(`>> Current operator login '${client.application.operator.login}'`);
  console.log(`>> Current operator compute string '${client.application.operator.computeString}'`);
  console.log(`>> Current operator timezone '${client.application.operator.timezone}'`);
  console.log(`>> Current operator rights '${client.application.operator.rights}'`);
  console.log(`>> Does the current user have admin rights? '${client.application.operator.hasRight("admin")}'`);

  console.log(`\nDisplaying some common options`);
  console.log(`>> XtkDatabaseId option '${await client.getOption("XtkDatabaseId")}'`);
  console.log(`>> XtkDatabaseId option (from cache) '${await client.getOption("XtkDatabaseId")}'`);      // option is now cached
  console.log(`Setting the ACC_JS_SDK option to the SDK version and current timestamp`);
  await client.setOption("ACC_JS_SDK", `${version.description} version ${version.version} on ${new Date().toISOString()}`);
  console.log(`>> ACC_JS_SDK option (from cache) '${await client.getOption("ACC_JS_SDK")}'`);

  console.log(`\nThe static method xtk:session#GetServerTime returns the server current date+time as a JavaScript date.\nWhen printing the date, it will be localized by JavaScipt to your local settings, but the actual timestamp is available in UTC`);
  var result = await NLWS.xtkSession.getServerTime();
  console.log(`>> Server timestamp (UTC): ${result.toUTCString()}`);
  console.log(`>> Server timestamp (localized): ${result}`);

  console.log(`\nThe Logon API also returns a 'serverInfo' structure that gives some information about the server`);
  const sessionInfo = client.getSessionInfo();
  console.log(`>> Server info: ${JSON.stringify(sessionInfo.serverInfo)}`);

  console.log(`\nThe Logon API also returns a 'userInfo' structure that gives some information about the current user`);
  console.log(`>> User info: ${JSON.stringify(sessionInfo.userInfo)}`);

  console.log("\nLogging off");
  await client.logoff();

});