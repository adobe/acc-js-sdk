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
 * Unit tests for the xtk:persist interface (CRUD operations)
 *
 *********************************************************************************/
const Mock = require('./mock.js').Mock;

describe('xtk:persist interface', function () {

    describe("create", () => {
        it("Should create an object", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });
            expect(delivery.__xtkProxy).toBe(true);
            expect(delivery.inspect()).toMatchObject({ label: "Hello" });
        });

        it("Should support missing argument", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            const delivery = client.NLWS.nmsDelivery.create();
            expect(delivery.__xtkProxy).toBe(true);
            expect(delivery.inspect()).toMatchObject({ });
        });
    });

    describe("NewInstance", () => {

        it("Should create a new delivery instance", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            // Create the proxy object
            const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });

            // Calling NewInstance will load the nms:delivery schema. As this schema
            // implements the xtk:persist interface, it will first load xtk:session
            client._transport.mockReturnValueOnce(Mock.GET_NMS_DELIVERY_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GET_DELIVERY_NEW_INSTANCE_RESPONSE);
            await delivery.newInstance();

            expect(client._transport).toHaveBeenCalledTimes(4);
            expect(client._transport.mock.calls[1][0].data).toMatch("xtk:schema|nms:delivery"); // first we fetched the delivery schema
            expect(client._transport.mock.calls[2][0].data).toMatch("xtk:schema|xtk:session"); // this triggered a fetch of the session schema
            expect(client._transport.mock.calls[3][0].data).toMatch("urn:xtk:persist|nms:delivery"); // now we're calling the interface method
            expect(client._transport.mock.calls[3][0].data).toMatch("xtkschema=\"nms:delivery\""); // and which should have the xtkschema set
            const result = await client._transport.mock.results[3].value;
            expect(result).toMatch("<folder _cs=\"Delivery templates\"/>");

            // Calling another non-static method on the delivery
            client._transport.mockReturnValueOnce(Mock.GET_DELIVERY_TEST_RESPONSE);
            await delivery.test();
            expect(client._transport).toHaveBeenCalledTimes(5);
            expect(client._transport.mock.calls[4][0].data).toMatch("<folder _cs=\"Delivery templates\"/>"); // Call should have the result of new instance as first parameter
            expect(client._transport.mock.calls[4][0].data).toMatch("xtkschema=\"nms:delivery\""); // and also have the xtkschema attribute set
        });

        it("Should support passing an xtk proxy in stead of a DOM document", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const delivery = client.NLWS.nmsDelivery.create({ label: "Hello" });

            client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?><SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                <WriteResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                </WriteResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
            await client.NLWS.xtkSession.write(delivery);
            expect(client._transport).toHaveBeenCalledTimes(3);
            expect(client._transport.mock.calls[2][0].data).toMatch("label=\"Hello\""); // entity proxy has been correctly serialized
        })
    });

});
