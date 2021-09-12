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

( async () => {

  await utils.sample({
    title: "Display the SDK version",
    labels: [ "Basics", "getSDKVersion" ],
    code: async () => {
      const version = sdk.getSDKVersion();
      console.log(`>> ${version.description} version ${version.version}`);
    }
  });

  await utils.sample({
    title: "Log on and log off",
    labels: [ "Basics", "connectionParameters", "ofUserAndPassword", "xtk:session", "logon", "logoff" ],
    description: `How to create a "ConnectionParameters" object and logon and logoff to Campaign using a user and password`,
    code: async () => {
      console.log(`Connecting to Campaign instance '${utils.url}' with user '${utils.user}'`);
      const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(utils.url, utils.user, utils.password);
      const client = await sdk.init(connectionParameters);
      await client.logon();
      console.log("Connected to Campaign instance. The application object contains some information about the instance and logged user");
      console.log(`>> Is logged?  '${client.isLogged()}'`)
      console.log(`>> Instance name '${client.application.instanceName}'`)
      console.log(`>> Build number '${client.application.buildNumber}'`)
    
      console.log("\nLogging off");
      return await client.logoff();
    }
  });

  await utils.sample({
    title: "Test if a package is installed",
    labels: [ "Basics", "application", "hasPackage" ],
    description: `How to test if a package is installed or not`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log(`>> Installed packages '${client.application.packages}'`)
        console.log(`>> Is the FDA package installed? -> ${client.application.hasPackage("nms:federatedDataAccess")}`)
      });
    }
  });

  await utils.sample({
    title: "Information about the current user",
    labels: [ "Basics", "application", "operator", "Current User" ],
    description: `How to access metadata about the instance and logged user`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log(`The application.operator object contains information about the current user`);
        console.log(`>> Current operator id '${client.application.operator.id}'`);
        console.log(`>> Current operator login '${client.application.operator.login}'`);
        console.log(`>> Current operator compute string '${client.application.operator.computeString}'`);
        console.log(`>> Current operator timezone '${client.application.operator.timezone}'`);
        console.log(`>> Current operator rights '${client.application.operator.rights}'`);
        console.log(`>> Does the current user have admin rights? '${client.application.operator.hasRight("admin")}'`);
      });
    }
  });

  await utils.sample({
    title: "Getting and setting options",
    labels: [ "Basics", "option", "getOption", "setOption", "xtk:session" ],
    description: `How to access to Campaign options (getting and setting options)`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const version = sdk.getSDKVersion();
        console.log(`Displaying some common options`);
        console.log(`>> XtkDatabaseId option '${await client.getOption("XtkDatabaseId")}'`);
        console.log(`>> XtkDatabaseId option (from cache) '${await client.getOption("XtkDatabaseId")}'`);      // option is now cached
        console.log(`Setting the ACC_JS_SDK option to the SDK version and current timestamp`);
        await client.setOption("ACC_JS_SDK", `${version.description} version ${version.version} on ${new Date().toISOString()}`);
        console.log(`>> ACC_JS_SDK option (from cache) '${await client.getOption("ACC_JS_SDK")}'`);
      });
    }
  });

  await utils.sample({
    title: "Getting the current server time",
    labels: [ "Basics", "GetServerTime", "Date", "xtk:session", "GetDate", "CurrentDate" ],
    description: `Get the current timestamp in the server database clock`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log(`The static method xtk:session#GetServerTime returns the server current date+time as a JavaScript date.\nWhen printing the date, it will be localized by JavaScipt to your local settings, but the actual timestamp is available in UTC`);
        var result = await NLWS.xtkSession.getServerTime();
        console.log(`>> Server timestamp (UTC): ${result.toUTCString()}`);
        console.log(`>> Server timestamp (localized): ${result}`);
      });
    }
  });

  await utils.sample({
    title: "ServerInfo structure",
    labels: [ "Basics", "Logon", "ServerInfo", "xtk:session" ],
    description: `Get the 'serverInfo' structure which gives some information about the server`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const sessionInfo = client.getSessionInfo();
        console.log(`>> Server info: ${JSON.stringify(sessionInfo.serverInfo)}`);
      });
    }
  });

  await utils.sample({
    title: "UserInfo structure",
    labels: [ "Basics", "Logon", "UserInfo", "xtk:session" ],
    description: `Get the 'userInfo' structure which gives some information about the current user`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const sessionInfo = client.getSessionInfo();
        console.log(`>> User info: ${JSON.stringify(sessionInfo.userInfo)}`);
      });
    }
  });

})();