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



async function makeClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", options);
    const client = await sdk.init(connectionParameters);
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
            expect(DomUtil.toJSON(DomUtil.parse("<root att='hello'/>"))["att"]).toBe("hello");
        });
    });


    describe("IP", () => {
        it("Should get IP address", async () => {
            const t = jest.fn();
            const old = sdk._transport(t);
            try {
                t.mockReturnValueOnce(Promise.resolve({ "ipAddress":"AAA.BBB.CCC.DDD","continentCode":"EU","continentName":"Europe","countryCode":"FR","countryName":"France","stateProv":"Centre-Val de Loire","city":"Bourges" }));
                const ip = await sdk.ip();
                expect(ip).toMatchObject({ "ipAddress":"AAA.BBB.CCC.DDD" });
            } finally {
                sdk._transport(old);
            }
        });
    });

    describe("expandXPath", () => {
        it("Should support empty paths", () => {
            expect(sdk.expandXPath(null)).toBe(null);
            expect(sdk.expandXPath(undefined)).toBe(undefined);
            expect(sdk.expandXPath("")).toBe("");
        });

        it("Should preserve already expanded xpath", () => {
            expect(sdk.expandXPath("[@email]")).toBe("[@email]");
            expect(sdk.expandXPath("[@recipient-id]")).toBe("[@recipient-id]");
            expect(sdk.expandXPath("[recipient/@id]")).toBe("[recipient/@id]");
        });

        it("Should not add brackets if not necessary", () => {
            expect(sdk.expandXPath("@email")).toBe("@email");
            expect(sdk.expandXPath("@email_address")).toBe("@email_address");
        });

        it("Should add brackets if necessary", () => {
            expect(sdk.expandXPath("@recipient-id")).toBe("[@recipient-id]");
            expect(sdk.expandXPath("email/@address")).toBe("[email/@address]");
            expect(sdk.expandXPath("nms:recipient")).toBe("[nms:recipient]");
        });
    });

    describe("unexpandXPath", () => {
        it("Should support empty paths", () => {
            expect(sdk.unexpandXPath(null)).toBe(null);
            expect(sdk.unexpandXPath(undefined)).toBe(undefined);
            expect(sdk.unexpandXPath("")).toBe("");
        });

        it("Should remove brackets", () => {
            expect(sdk.unexpandXPath("[@email]")).toBe("@email");
            expect(sdk.unexpandXPath("[@recipient-id]")).toBe("@recipient-id");
            expect(sdk.unexpandXPath("[recipient/@id]")).toBe("recipient/@id");
        });

        it("Should preseve already unexpanded pathx", () => {
            expect(sdk.unexpandXPath("@email")).toBe("@email");
            expect(sdk.unexpandXPath("@email_address")).toBe("@email_address");
        });

        it("Should support array-paths", () => {
            expect(sdk.unexpandXPath("coll[0]")).toBe("coll[0]");
            expect(sdk.unexpandXPath("[coll[0]]")).toBe("coll[0]");
        });
    });
    
    describe("xtkConstText", () => {
        it("Should handle various types", () => {
            // Strings are quoted and escaped
            expect(sdk.xtkConstText("Hello", "string")).toBe("'Hello'");
            expect(sdk.xtkConstText("", "string")).toBe("''");
            expect(sdk.xtkConstText(123, "string")).toBe("'123'");
            expect(sdk.xtkConstText("Hello'World", "memo")).toBe("'Hello\\'World'");
            // Numbers are unchanged
            expect(sdk.xtkConstText(123, "long")).toBe("123");
            expect(sdk.xtkConstText(-42.3, "double")).toBe("-42.3");
            expect(sdk.xtkConstText("", "long")).toBe("0");
            expect(sdk.xtkConstText(undefined, "short")).toBe("0");
            // Timestamps are surrounded by ##
            expect(sdk.xtkConstText("2022-02-15T09:49:04.000Z", "datetime")).toBe("#2022-02-15T09:49:04.000Z#");
            expect(sdk.xtkConstText("", "datetime")).toBe("##");
            expect(sdk.xtkConstText(undefined, "date")).toBe("##");
        });
    });

});
