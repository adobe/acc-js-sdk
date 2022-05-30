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

const url = process.env.ACC_URL;    // "http://accaepxl-rt1.rd.campaign.adobe.com:8080";
if (!url) {
  console.error(`Environment variable ACC_URL is not defined`);
  process.exit(1);
}
const user = process.env.ACC_USER;  //"admin";
if (!user) {
  console.error(`Environment variable ACC_USER is not defined`)
  process.exit(1);
}
const password = process.env.ACC_PASSWORD || "";


async function run(main) {
  return main.apply(this).then(() => {
  })
  .catch((err) => {
    console.error(err);
  });
}

/**
 * Logon to Campaign, execute code, and logoff
 * @param {*} callback 
 * @returns 
 */
async function logon(callback) {
  var main = async () => {
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword(url, user, password, {
      clientApp: 'acc-js-sdk sample'
    });
    const client = await sdk.init(connectionParameters);
    const NLWS = client.NLWS;
  
    await client.logon();
    console.log(`Connected to Campaign instance '${client.getSessionInfo().serverInfo.instanceName}' build '${client.getSessionInfo().serverInfo.buildNumber}' with user '${client.application.operator.login}'`);
  
    await callback.apply(this, [client, NLWS]);
    await client.logoff();
  };
  return run(main);
}

/**
 * Defines and executes a sample
 * @param {Sample} options 
 */
async function sample(options) {
  console.log(`================================================================================
Sample ........... ${options.title}
Labels ........... ${options.labels.map((i) => `[${i}]`).join(" ")}
Description ...... ${options.description || ""}
`);
  await options.code.apply(this, [])
    .catch((ex) => {
      console.error("Failed to run sample:", ex);
    });
}


module.exports.url = url;
module.exports.user = user;
module.exports.password = password;

module.exports.run = run;
module.exports.logon = logon;
module.exports.sample = sample;

