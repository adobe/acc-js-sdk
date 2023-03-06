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
 * Unit tests for the TypedJson representation
 *
 *********************************************************************************/

const Mock = require('./mock.js').Mock;

describe('ACC Client with typed JSON', function () {

    describe("QueryDef", () => {
        it("select with empty result", async () => {
            const client = await Mock.makeClient({ representation: "TypedJson" });
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
            <SOAP-ENV:Body>
            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount-collection/>
                </pdomOutput></ExecuteQueryResponse>
            </SOAP-ENV:Body>
            </SOAP-ENV:Envelope>`));

            var queryDef = {
                "schema": "nms:extAccount",
                "operation": "select",
                "select": {
                    "node": [
                        { "expr": "@id" },
                        { "expr": "@name" }
                    ]
                }
            };

            // Select should return empty array
            var query = client.NLWS.xtkQueryDef.create(queryDef);
            var extAccount = await query.executeQuery();
            expect(extAccount).toEqual({ extAccount: [] });
        });

        it("getIfExists with a result of exactly one element", async () => {
            const client = await Mock.makeClient({ representation: "TypedJson" });
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
            <SOAP-ENV:Body>
            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount id="1"/>
                </pdomOutput></ExecuteQueryResponse>
            </SOAP-ENV:Body>
            </SOAP-ENV:Envelope>`));

            var queryDef = {
                "schema": "nms:extAccount",
                "operation": "getIfExists",
                "select": {
                    "node": [
                        { "expr": "@id" },
                        { "expr": "@name" }
                    ]
                }
            };

            // GetIfExists should return element
            var query = client.NLWS.xtkQueryDef.create(queryDef);
            var extAccount = await query.executeQuery();
            expect(extAccount).toEqual({ "id": 1 });
        });

        it("select with a result of exactly one element", async () => {
            const client = await Mock.makeClient({ representation: "TypedJson" });
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
            <SOAP-ENV:Body>
            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount-collection><extAccount id="1"/></extAccount-collection>
                </pdomOutput></ExecuteQueryResponse>
            </SOAP-ENV:Body>
            </SOAP-ENV:Envelope>`));

            var queryDef = {
                "schema": "nms:extAccount",
                "operation": "select",
                "select": {
                    "node": [
                        { "expr": "@id" },
                        { "expr": "@name" }
                    ]
                }
            };

            var query = client.NLWS.xtkQueryDef.create(queryDef);
            var extAccount = await query.executeQuery();
            expect(extAccount).toEqual({ extAccount: [{ "id": 1 }] });
        });
    });

    describe("Method-level representation", () => {
        it("Should force a json representation", async () => {
            const client = await Mock.makeClient({ representation: "TypedJson" });
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GET_QUERY_EXECUTE_RESPONSE);
            const queryDef = {
                "schema": "nms:extAccount",
                "operation": "select",
                "select": {
                    "node": [
                        { "expr": "@id" },
                        { "expr": "@name" }
                    ]
                }
            };
            const query = client.NLWS.typedJson.xtkQueryDef.create(queryDef);
            const result = await query.executeQuery();
            const json = JSON.stringify(result);
            expect(json).toBe('{"extAccount":[{"id":1816,"name":"defaultPopAccount"},{"id":1818,"name":"defaultOther"},{"id":1849,"name":"billingReport"},{"id":12070,"name":"TST_EXT_ACCOUNT_POSTGRESQL"},{"id":1817,"name":"defaultEmailBulk"},{"id":2087,"name":"ffda"},{"id":2088,"name":"defaultEmailMid"}]}');
        });
    });
});
