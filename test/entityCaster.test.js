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
const Mock = require('./mock.js').Mock;
const { EntityCaster, QueryDefSchemaInferer } = require('../src/entityCaster.js');

/**********************************************************************************
 * 
 * Unit tests for the EntityCaster class
 * 
 *********************************************************************************/


 const GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
        <SOAP-ENV:Body>
            <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                    <schema name="entityCaster" namespace="xtk">
                        <enumeration basetype="byte" default="edit" name="state">
                            <value name="edit" value="0"/>
                            <value name="live" value="17"/>
                        </enumeration>
                        <element name="entityCaster">
                            <attribute name="id" type="long"/>
                            <attribute name="internalName" type="string"/>
                            <element name="textOnly" type="string" length="100"/>
                            <attribute name="recipient-id" type="long"/>
                            <attribute name="state" type="byte" enum="state"/>

                            <attribute name="attAndElem" type="long"/>
                            <element name="attAndElem" type="string" length="100"/>

                            <element name="struct">
                                <attribute name="count" type="long"/>
                                <attribute name="created" type="datetime"/>
                            </element>

                        </element>
                    </schema>
                </pdomDoc>
            </GetEntityIfMoreRecentResponse>
        </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);
 
describe('EntityCaster', function() {

    describe('Cast according to schema', () => {

        const cast = async (entity) => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const schema = await client.getSchema("xtk:entityCaster", "xml");
            const caster = new EntityCaster(client, "xtk:entityCaster");
            const result = caster.cast(entity);
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            return result;
        }

        it('Should cast attributes', async () => {
            await expect(cast()).resolves.toBeUndefined();
            await expect(cast({})).resolves.toEqual({});
            await expect(cast({ id: "123" })).resolves.toEqual({ id: 123 }); // number
            await expect(cast({ internalName: "DM123" })).resolves.toEqual({ internalName: "DM123" });  // string
        });

        it('Should cast text nodes', async () => {
            await expect(cast({ id: "123", textOnly: "Hello" })).resolves.toEqual({ id: 123, textOnly: "Hello" });
        });

        it('Should handle attributes and elements with the same name', async () => {
            await expect(cast({ id: "123", attAndElem: "Hello", "@attAndElem": "123" })).resolves.toEqual({ id: 123, attAndElem: "Hello", "@attAndElem": 123 });
        });

        it("Should not case extra attributes", async () => {
            await expect(cast({ id: "123", notFound: "true" })).resolves.toEqual({ id: 123, notFound: "true" });
        });

        it("Should recurse to child elements", async () => {
            await expect(cast({ struct: { count: "4", created: "2022-11-17 14:08:52.670Z" } })).resolves.toEqual({ struct: { count:4, created: new Date(1668694132670) } });
        });
    });

    describe("Infer query schema", () => {

        describe("Create nodes on the fly", () => {

            it("Should create attributes", () => {
                const infer = new QueryDefSchemaInferer();
                const root = { children:{} };
                infer._createNode(root, "@id", { type:"long" });
                expect(root.children).toMatchObject({ "@id": { node:{type:"long"} } });
                infer._createNode(root, "@internalName", { type:"string", length: 64 });
                expect(root.children).toMatchObject({ "@id": { node:{type:"long"} }, "@internalName": { node:{type:"string",length:64} } });
            });
        });

        describe("Build Schema", () => {

            const inferQueryDefSchema = async (nodes) => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
                await client.getSchema("xtk:entityCaster", "xml");
                const queryDef = {
                    schema: "xtk:entityCaster",
                    operation: "get",
                    select: { node: nodes },
                    where: { condition: [ { expr:`@internalName='DM19'` } ] }
                  };
                const infer = new QueryDefSchemaInferer(client, queryDef);
                const schema = await infer.getSchema();
                client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
                await client.NLWS.xtkSession.logoff();
                return schema;
            }

            it("Should support query with a single node created as an object and not as an array", async () => {
                const schema = await inferQueryDefSchema( { expr: "@id" } );
                await expect(schema.root.findNode("@id")).resolves.toMatchObject({ name:"@id", type:"long" });
            });

            it("Should support query with multiple attributes", async () => {
                const schema = await inferQueryDefSchema([ { expr: "@id" }, { expr: "@internalName" }, { expr: "textOnly" }, { expr: "[@recipient-id]" } ]);
                await expect(schema.root.findNode("@id")).resolves.toMatchObject({ name:"@id", type:"long" });
                await expect(schema.root.findNode("@internalName")).resolves.toMatchObject({ name:"@internalName", type:"string" });
                await expect(schema.root.findNode("textOnly")).resolves.toMatchObject({ name:"textOnly", type:"string" });
                await expect(schema.root.findNode("[@recipient-id]")).resolves.toMatchObject({ name:"@recipient-id", type:"long" });
            });

            it("Should support the compute string", async () => {
                const schema = await inferQueryDefSchema([ { expr: "[.]", alias: "@cs" }]);
                await expect(schema.root.findNode("@cs")).resolves.toMatchObject({ name:"@cs", type:"string" });
            });

            it("Should support attribute aliases", async () => {
                const schema = await inferQueryDefSchema([ { expr: "@id", alias: "@hello" } ]);
                await expect(schema.root.children.length).toBe(1);
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@hello")).resolves.toMatchObject({ name:"@hello", type:"long" });
            });

            it("Should support nested attributes", async () => {
                const schema = await inferQueryDefSchema([ { expr: "[struct/@count]" } ]);
                await expect(schema.root.findNode("struct/@count")).resolves.toMatchObject({ name:"@count", type:"long" });
            });

            it("Should support nested attribute alias at top level", async () => {
                const schema = await inferQueryDefSchema([ { expr: "[struct/@count]", alias:"@total" } ]);
                await expect(schema.root.findNode("@total")).resolves.toMatchObject({ name:"@total", type:"long" });
            });

            it("Should support nested query nodes", async () => {
                const schema = await inferQueryDefSchema([ { expr:"struct", node: { expr:"@count" } } ]);
                await expect(schema.root.findNode("struct/@count")).resolves.toMatchObject({ name:"@count", type:"long" });
            });

            it("Should support analyze attribute", async () => {
                const schema = await inferQueryDefSchema([ { expr: "@state", analyze: true }]);
                await expect(schema.root.findNode("@state")).resolves.toMatchObject({ name:"@state", type:"byte" });
                await expect(schema.root.findNode("@stateName")).resolves.toMatchObject({ name:"@stateName", type:"string" });
                await expect(schema.root.findNode("@stateLabel")).resolves.toMatchObject({ name:"@stateLabel", type:"string" });
            });

            //TODO: what about anyType="true"

            // TODO: a nod which ontain just a link name (ex: "delivery")
        });
    });

});
