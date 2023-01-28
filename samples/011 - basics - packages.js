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
const { DomUtil } = require('../src/domUtil.js');
const sdk = require('../src/index.js');
const utils = require("./utils.js");


/**
 * This sample illustrates how to generate and import packages
 */

( async () => {

  await utils.sample({
    title: "Testing generating and importing packages (in XML)",
    labels: [ "Basics", "Packages", "xtk:builder", "InstallPackage" ],
    description: `The xtkBuilder.installPackage() can be used to import packages`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log(`Generating package with an option named AccJsSdk`);
        const doc =  sdk.DomUtil.newDocument('pkgDesc');
        const package = doc.createElement('package');
        doc.documentElement.appendChild(package);
        package.setAttribute('namespace', 'cus');
        package.setAttribute('name', 'sdk');
        package.setAttribute('buildNumber', '*');
        package.setAttribute('buildVersion', '*');
        package.setAttribute('label', 'Test package for ACC JS SDK');
        package.setAttribute('vendor', 'acc-js-sdk');
        
        const entities = doc.createElement('entities');
        package.appendChild(entities);
        entities.setAttribute('schema', 'xtk:option');
      
        const option = doc.createElement('option');
        option.setAttribute('name', 'AccJsSdk');
        option.setAttribute('dataType', '6');
        const version = client.application.version;
        option.setAttribute('stringValue', JSON.stringify(version));
        entities.appendChild(option);
      
        // Install package. The package is in XML format and we set the timeout to 5 mins to prevent any issues
        console.log(`Installing package`, DomUtil.toXMLString(doc));
        await NLWS.xml.pushDown({ timeout: 5*60*1000 }).xtkBuilder.installPackage(doc);      
      });
    }
  });

  await utils.sample({
    title: "Testing generating and importing packages (in JSON)",
    labels: [ "Basics", "Packages", "xtk:builder", "InstallPackage" ],
    description: `The xtkBuilder.installPackage() can be used to import packages`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log(`Generating package with a service named 'newsletterTest'`);

        const jsonPackage = { 
            package: {
              buildNumber: "*",
              buildVersion: "*",
              entities: {
                schema:"nms:service",
                service: {
                  label: "NewsletterTest",
                  name: "newsletterTest", 
                  folder: {
                    _operation: "none",
                    name: "nmsSetOfServices"
                  },
                  visitorFolder: {
                    _operation: "none",
                    name: "nmsVisitor"
                  }
                }
              }
            }
          };
        await NLWS.pushDown({ timeout: 5*60*1000 }).xtkBuilder.installPackage(jsonPackage);
        console.log(`Package installed`);
      });
    }
  });

})();

