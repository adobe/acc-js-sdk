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


/**********************************************************************************
 * 
 * Shared code / utilities for samples
 * 
 *********************************************************************************/
'use strict'

const rt1_url = "http://accaepxl-rt1.rd.campaign.adobe.com:8080";
const url = "http://accaepxl.rd.campaign.adobe.com:8080";
const user = "admin";
const password = "put password here";

async function attempt(callback) {
  try {
    await callback();
  } catch(ex) {
    console.error(ex);
  }
}

async function run(main) {
  return main.apply(this).then(() => {
    //console.log("Done.");
  })
  .catch((err) => {
    console.error(err);
  });
}

async function logon(callback) {

  var main = async () => {
    //var version = sdk.getSDKVersion();
    //console.log(`${version.description} version ${version.version}`);
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(url, user, password);
    const client = await sdk.init(connectionParameters);
    const NLWS = client.NLWS;
  
    await client.logon();
    console.log(`Connected to Campaign instance '${client.getSessionInfo().serverInfo.instanceName}' build '${client.getSessionInfo().serverInfo.buildNumber}' with user '${client.application.operator.login}'`);
  
    await callback.apply(this, [client, NLWS]);
    //console.log("Logging off");
    await client.logoff();
  };

  return run(main);
}

async function sample(options) {
  console.log(`================================================================================
Sample ........... ${options.title}
Labels ........... ${options.labels.map((i) => `[${i}]`).join(" ")}
Description ...... ${options.description || ""}
`);
  return options.code.apply(this, []);
}


module.exports.url = url;
module.exports.user = user;
module.exports.password = password;
module.exports.rt1_url = rt1_url;

module.exports.run = run;
module.exports.logon = logon;
module.exports.sample = sample;
module.exports.attempt = attempt;
