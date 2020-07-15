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
 * Test the Browser-side implementation of the request-promise-native node module.
 * 
 *********************************************************************************/

 const request = require('../src/web/request.js');
 
describe('JSDOM', function() {

    Headers = function() {
    }
    Headers.prototype.append = function(key, value) {
        this[key] = value;
    }

    Request = function(url, options) {
        this.url = url;
        this.options = options;
    }

    it('Should run a successful request', async function() {

        fetch = async (request) => {
            return  {
                ok: true,
                blob: async () => {
                    return {
                        text: async () => {
                            return "All done.";
                        }
                    }
                }
            }
        };

        var body = await request({
            url: 'test',
            method: 'POST',
            headers: { 'foo':'bar', 'toto':'titi'}
        });
        expect(body).toBe("All done.");
    });

    it('Should run a failed request', async function() {

        fetch = async (request) => {
            return  {
                ok: false,
                status: 404,
                statusText: 'Not found'
            }
        };

        expect(async () => {
            var body = await request({
                url: 'test',
                method: 'POST',
                headers: { 'foo':'bar', 'toto':'titi'}
            });
        }).rejects.toThrow();
    });


});
