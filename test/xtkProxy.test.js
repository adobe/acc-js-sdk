/*
Copyright 2022 Adobe. All rights reserved.
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
 * Unit tests for the xtk proxies
 * A xtk proxy is an javascript Proxy object returned by the SDK create() function
 * 
 * The proxy object intercept method calls and transforms them into async API calls.
 *
 *********************************************************************************/
const Mock = require('./mock.js').Mock;

let client = undefined;

beforeAll(async () => {
    client = await Mock.makeClient();
    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
    await client.NLWS.xtkSession.logon();
});

describe('xtk proxies', function () {

    it("Should create objects", async () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        expect(delivery.__xtkProxy).toBe(true); // proxy have the __xtkProxy property
    });

    it("Should has schemaId", async () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        expect(delivery["."].schemaId).toBe("nms:delivery"); // ["."] is the call context
    });

    it("Should return the underlying object", async () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        expect(delivery["."].object).toMatchObject({ label: "Hello" });
        expect(delivery.entity).toMatchObject({ label: "Hello" });
        expect(delivery.inspect()).toMatchObject({ label: "Hello" });
    });

    it("Should allow to get properties", () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        expect(delivery.entity.label).toBe("Hello");
    });

    it("Should allow to set properties", () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        delivery.label = "World";
        expect(delivery.entity.label).toBe("World");
        delivery.entity.label = "Hello World";
        expect(delivery.entity.label).toBe("Hello World");
    });

    it("Should have a save method", async () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        // The save method is simmply a proxy to xtk:session#Write
        const mockWrite = jest.fn();
        delivery["."].client = { NLWS: { xtkSession: { write: mockWrite } } };
        await delivery.save();
        expect(mockWrite).toHaveBeenCalledWith(delivery.entity);
    });

    it("Should proxy function calls to API calls", async () => {
        const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
        const mockCallMethod = jest.fn();
        delivery["."].client = { _callMethod: mockCallMethod };
        await delivery.myCall("Hello");
        expect(mockCallMethod).toHaveBeenCalledWith("MyCall", delivery["."], [ "Hello" ]);
    });

});
