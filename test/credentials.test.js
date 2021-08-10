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
 * Unit tests for the ACC credentials
 * 
 *********************************************************************************/

const sdk = require('../src/index.js');

describe("ACC Credentials", () => {

    it("Should create UserPassword credentials" ,() => {
        const credentials = new sdk.Credentials("UserPassword", "admin/pass");
        expect(credentials._getUser()).toBe("admin");
        expect(credentials._getPassword()).toBe("pass");
        expect(credentials._type).toBe("UserPassword");
    });

    it("Should not allow to get user/password if credentials type does not allow for it", () => {
        expect(() => { new sdk.Credentials("Invalid"); }).toThrow("Invalid credentials type");
    });

    it("Should fail on invalid credentials type", () => {
        expect(() => { const credentials = new sdk.Credentials("ImsServiceToken", "admin/pass"); credentials._getUser(); }).toThrow("Cannot get user for Credentials");
        expect(() => { const credentials = new sdk.Credentials("ImsServiceToken", "admin/pass"); credentials._getPassword(); }).toThrow("Cannot get password for Credentials");
    });
})


describe("Connection parameters", () => {

    it("Should create connection parameters with user and password", () => {
        const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://campaign.adobe.com", "admin", "pass");
        expect(connectionParameters._endpoint).toBe("http://campaign.adobe.com");
        expect(connectionParameters._credentials._type).toBe("UserPassword");
        expect(connectionParameters._credentials._getUser()).toBe("admin");
        expect(connectionParameters._credentials._getPassword()).toBe("pass");
        expect(connectionParameters._options.representation).toBe("SimpleJson");
    });

    it("Should create connection parameters with IMS service token", () => {
        const connectionParameters = sdk.ConnectionParameters.ofUserAndServiceToken("http://campaign.adobe.com", "admin", "==token==");
        expect(connectionParameters._endpoint).toBe("http://campaign.adobe.com");
        expect(connectionParameters._credentials._type).toBe("ImsServiceToken");
        expect(connectionParameters._options.representation).toBe("SimpleJson");
    });

});