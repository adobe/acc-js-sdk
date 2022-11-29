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


/**********************************************************************************
 * 
 * Compiles the SDK for using in a browser
 * Runs without any parameters. Will create a file named "dist/bundle.js"
 * 
 *********************************************************************************/
const fs = require('fs');

const pjson = require('./package.json');

console.log("ACC client-side SDK compiler version " + pjson.version);

// Add files / resources to bundle here in dependency order
var resources = [
    { name: "../package.json" },
    { name: "./util.js" },
    { name: "./campaign.js" },
    { name: "./transport.js" },
    { name: "./xtkCaster.js" },
    { name: "./domUtil.js" },
    { name: "./xtkJob.js" },
    { name: "./cache.js" },
    { name: "./entityAccessor.js" },
    { name: "./xtkEntityCache.js" },
    { name: "./methodCache.js" },
    { name: "./optionCache.js" },
    { name: "./cacheRefresher.js" },
    { name: "./soap.js" },
    { name: "./crypto.js" },
    { name: "./application.js" },
    { name: "./testUtil.js" },
    { file: "../node_modules/qs-stringify/index.js", name: "qs-stringify" },
    { name: "./client.js" },
    { name: "./index.js" },
];


const outFileName = "./dist/bundle.js";
if (!fs.existsSync("./dist")) fs.mkdirSync("./dist"); 
const rootPath = "./src";


// Generate the bundle

const outFile = fs.openSync(outFileName, 'w');
fs.writeSync(outFile, `/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2020 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by all applicable intellectual property
* laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/


/**********************************************************************************
 * 
 * ACC client side SDK ${pjson.version}
 * This is a generated file. DO NOT MODIFY
 * Generated on ${new Date().toISOString()}
 * 
 *********************************************************************************/

document.accSDK = (function() {

    const module = { exports: {} };
`);



function bundleFile(fileName, above, below, before) {
    above = above || '';
    below = below || '';
    before = before || '';
    fs.writeSync(outFile, `
;
${above}
;
//\\//\\//\\ BEGIN ${fileName} //\\//\\//\\
${before}`);
    const data = fs.readFileSync(`${rootPath}/${fileName}`, 'utf8');
    fs.writeSync(outFile, data);
    fs.writeSync(outFile, `;

//\\//\\//\\ END ${fileName} //\\//\\//\\
;
${below}
;
`);
}

// Add bundler
bundleFile('/web/bundler.js');

// Writes module map
resources.forEach(resource => {
    fs.writeSync(outFile, `define("${resource.name}");
`);
});


// Bundle modules
resources.forEach(resource => {
    const fileName = resource.file || resource.name;
    console.log(`Bundling ${fileName}`);
    const above = `(function(module, exports) {
`;
    const below = `
})(modules["${resource.name}"], modules["${resource.name}"].exports);
`;
    if (fileName.length >= 5 && fileName.substr(fileName.length-5) == ".json")
        var before = `module.exports = `;
    bundleFile(fileName, above, below, before);
});


fs.writeSync(outFile, `
return require("./index.js");

})();
`);

fs.closeSync(outFile);

console.log(`Client-side SDK generated in ${outFileName}`);
