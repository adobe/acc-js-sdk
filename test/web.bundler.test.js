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
 * Test the web bundler
 * 
 *********************************************************************************/

 const bundler = require('../src/web/bundler.js');
 
describe('Bundler', function() {

    it('Should require a module', async function() {
        bundler.define('test');
        bundler.modules.test.exports.test = () => 1;
        const exports = bundler.require('test');
        expect(exports.test()).toBe(1);
    });

    it('Should fail to require a inexisting module', async function() {
        expect(() => {
            bundler.define('test');
            bundler.modules.test.exports.test = () => 1;
            const exports = bundler.require('notFound');
        }).toThrow();
    });

    it('Should fail to require an empty module', async function() {
        expect(() => {
            bundler.define('test');
            bundler.define('empty');
            bundler.modules.test.exports.test = () => 1;
            const exports = bundler.require('empty');
        }).toThrow();
    });


});
