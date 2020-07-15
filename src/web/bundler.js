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
 * The bundler is a lightweight fake "require" implementation in order to 
 * run the ACC SDK inside a browser.
 * The compiler (see compile.js) includes the bundler in the generated code.
 * This is the place to add helper functions that helps to run the node.js code
 * in a browser
 * 
 *********************************************************************************/


const modules = {};

function define(name) {
    modules[name] = { exports: {} };
}

function require(name) {
    const module = modules[name];
    if (!module) throw new Error(`Module ${name} not found`);
    if (typeof module.exports != "function" && Object.keys(module.exports).length == 0) throw new Error(`Module ${name} found but not loaded yet`);
    return module.exports;
}

// Useful for node.js tests
module.exports.require = require;
module.exports.define = define;
module.exports.modules = modules;
