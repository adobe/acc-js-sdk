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
 * Unit tests for the ACC client initializer
 * 
 *********************************************************************************/

 const sdk = require('../src/index.js');



async function makeClient(rememberMe) {
    const client = await sdk.init("http://acc-sdk:8080", "admin", "admin", rememberMe);
    client.soapTransport = jest.fn();
    return client;
}


describe('ACC SDK', function() {

    describe('Init', function() {

        it('Should create client', async function() {
            const client = await makeClient();
            const NLWS = client.NLWS;
            expect(NLWS).toBeTruthy();
            const version = sdk.getSDKVersion();
            expect(version).toBeTruthy();
            expect(version.version).toBeTruthy();
            expect(version.name).toBe("@adobe/acc-js-sdk")
            expect(client.isLogged()).toBe(false);
        });

    });

    describe('Helpers',  () => {

        it('Should get a XtkCaster', async () => {
            const XtkCaster = sdk.XtkCaster;
            expect(XtkCaster.asBoolean("true")).toBeTruthy();
            expect(XtkCaster.asBoolean("false")).not.toBeTruthy();
        });

        it('Should get a DomUtil', async () => {
            const DomUtil = sdk.DomUtil;
            expect(DomUtil.toJSON(DomUtil.parse("<root att='hello'/>"))["@att"]).toBe("hello");
        });
    });

});
