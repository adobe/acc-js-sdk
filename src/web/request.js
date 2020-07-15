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
 * Browser-side implementation of the request-promise-native node module.
 * This simply wraps the fetch API
 * From https://www.npmjs.com/package/request-promise-native
 * 
 *********************************************************************************/



function request(options) {

    const headers = new Headers();
    for (var k in options.headers) {
        headers.append(k, options.headers[k]);
    }    
    const r = new Request(options.url, {
        method: options.method,
        headers: headers,
        body: options.body
    });

    const p = fetch(r).then((response) => {
        if (!response.ok)
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        return response.blob().then((blob) => {
            return blob.text();
        });
    });
    return p;
}

module.exports = request;