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
const { DomUtil } = require('../src/domUtil.js');
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

                            <!-- unbound collection directly in the root node -->
                            <element name="coll" unbound="true">
                                <attribute name="count" type="long"/>
                                <attribute name="created" type="datetime"/>
                            </element>
                            <!-- unbound collection is a child element -->
                            <element name="book">
                                <element name="chapter" unbound="true">
                                    <attribute name="idx" type="long"/>
                                    <attribute name="name" type="string"/>
                                </element>
                            </element>

                            <element name="sourceId" type="long"/>

                            <element name="country" type="link" target="xtk:country"/>
                        </element>
                    </schema>
                </pdomDoc>
            </GetEntityIfMoreRecentResponse>
        </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);


const GET_XTK_ENTITYCASTER_COUNTRY_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
        <SOAP-ENV:Body>
            <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                    <schema name="country" namespace="xtk">
                        <element name="country">
                            <attribute name="id" type="long"/>
                            <attribute name="name" type="string"/>
                        </element>
                    </schema>
                </pdomDoc>
            </GetEntityIfMoreRecentResponse>
        </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);
 
describe('EntityCaster', function() {

    describe('Cast according to schema', () => {

        const cast = async (entity, options, beforeCastHook) => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const schema = await client.getSchema("xtk:entityCaster", "xml");   // preload schema
            if (options === undefined) options = { enabled: true };
            const caster = new EntityCaster(client, "xtk:entityCaster", options);
            if (beforeCastHook) {
                await beforeCastHook(client, caster);
            }
            const result = await caster.cast(entity);
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
            // Regular child
            await expect(cast({ struct: { count: "4", created: "2022-11-17 14:08:52.670Z" } })).resolves.toEqual({ struct: { count:4, created: new Date(1668694132670) } });
            // Child is unbound
            await expect(cast({ coll: null })).resolves.toEqual({ coll:[] });
            await expect(cast({ coll: { count: "4" } })).resolves.toEqual({ coll:[ { count: 4 } ] });
            await expect(cast({ coll: [ { count: "1" }, { count: "2" } ] })).resolves.toEqual({ coll:[ { count: 1 }, { count: 2 } ] });
            // Nested child
            await expect(cast({ book: { chapter: [ { id:"4", idx:"4" } ] } })).resolves.toEqual({ book: { chapter: [ { id: "4", idx: 4 } ] } });
        });

        it("Should not case if options do not say enabled", async () => {
            await expect(cast({ id: "123" }, null)).resolves.toEqual({ id: "123" });
            await expect(cast({ id: "123" }, null)).resolves.not.toEqual({ id: 123 });
        });

        it("Should fail on unknown schema", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            const caster = new EntityCaster(client, "xtk:entityCaster", { enabled: true });
            await expect(caster.cast({ id: "123" })).rejects.toMatchObject({ errorCode: "SDK-000016", faultString: "Unknown schema 'xtk:entityCaster'" });
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        describe("addEmptyArrays option", () => {
            it("Should add empty arrays on root element", async () => {
                const options = { enabled: true, addEmptyArrays: true };
                await expect(cast({}, options)).resolves.toEqual({ coll:[] });
            });

            it("Should add empty arrays in child element", async () => {
                const options = { enabled: true, addEmptyArrays: true };
                await expect(cast({ book: {} }, options)).resolves.toEqual({ coll:[], book: { chapter:[] } });
            });

            it("Should support falsy entities", async () => {
                const options = { enabled: true, addEmptyArrays: true };
                await expect(cast(undefined, options)).resolves.toBeUndefined();
            });
        });

        describe("Link support", () => {
            it("Should cast linked entities", async () => {
                const hook = async (client, caster) => {
                    client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_COUNTRY_SCHEMA_RESPONSE);
                    return await client.getSchema("xtk:country", "xml");
                };
                await expect(cast({ id: "123", country: { id: "4", name: "France" } }, undefined, hook)).resolves.toEqual({ id: 123, country: { id: 4, name: "France" } });
            });

            it("Should support links with not found target", async () => {
                const hook = async (client, caster) => {
                    client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                    return await client.application.getSchema("xtk:country");
                };
                // The "country" link is not found => this part of the entity will not be casted
                await expect(cast({ id: "123", country: { id: "4", name: "France" } }, undefined, hook)).resolves.toEqual({ id: 123, country: { id: "4", name: "France" } });
            });
        });

        it("Should ignore falsy schema", async () => {
            const client = await Mock.makeClient();
            var caster = new EntityCaster(client, undefined, { enabled: true });
            var result = await caster.cast({ id: "42" });
            expect(result).toMatchObject({ id: "42" });
            var caster = new EntityCaster(client, null, { enabled: true });
            var result = await caster.cast({ id: "42" });
            expect(result).toMatchObject({ id: "42" });
        });

        it("Should support preloaded schema", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const schema = await client.application.getSchema("xtk:entityCaster");   // preload schema
            const caster = new EntityCaster(client, schema, { enabled: true });
            
            const result = await caster.cast({ id: "123" });
            expect(result).toEqual({ id: 123 }); 

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });
    });

    describe("Infer query schema", () => {

        const inferQueryDefSchema = async (nodes, options) => {
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
            const infer = new QueryDefSchemaInferer(client, queryDef, options);
            const schema = await infer.getSchema();
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            return schema;
        };

        it("Should handle invalid schemas", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            const queryDef = {
                schema: "xtk:entityCaster",
                operation: "get",
                select: { node: { expr: "@id" } },
                where: { condition: [ { expr:`@internalName='DM19'` } ] }
              };
            const infer = new QueryDefSchemaInferer(client, queryDef);
            await expect(infer.getSchema()).rejects.toMatchObject({ errorCode: "SDK-000016" });
        });

        describe("Create nodes on the fly", () => {

            it("Should create attributes", () => {
                const infer = new QueryDefSchemaInferer();
                const root = { children:{} };
                infer._createNode(root, "@id", { type:"long" });
                expect(root.children).toMatchObject({ "@id": { node:{type:"long"} } });
                infer._createNode(root, "@internalName", { type:"string", length: 64 });
                expect(root.children).toMatchObject({ "@id": { node:{type:"long"} }, "@internalName": { node:{type:"string",length:64} } });
            });

            it("Should support self elements in xpath", () => {
                const infer = new QueryDefSchemaInferer();
                const root = { children:{} };
                infer._createNode(root, "./@id", { type:"long" });
                expect(root.children).toMatchObject({ "@id": { node:{type:"long"} } });
            });

            it("Should create nested nodes", () => {
                const infer = new QueryDefSchemaInferer();
                const root = { children:{} };
                infer._createNode(root, "a/b/c/@id", { type:"long" });
                expect(root.children.a.children.b.children.c.children).toMatchObject({ "@id": { node:{type:"long"} } });
            });

            it("Should add multiple times with same child", () => {
                const infer = new QueryDefSchemaInferer();
                const root = { children:{} };
                infer._createNode(root, "a/@id", { type:"long" });
                infer._createNode(root, "a/@two", { type:"boolean" });
                expect(root.children.a.children).toMatchObject({ "@id": { node:{type:"long"} }, "@two": { node:{type:"boolean"} } });
            });
        });

        describe("Build Schema", () => {

            it("Should support query with a single node created as an object and not as an array", async () => {
                const schema = await inferQueryDefSchema( { expr: "@id" } );
                await expect(schema.root.findNode("@id")).resolves.toMatchObject({ name:"@id", type:"long" });
            });

            it("Should support missing expressions", async () => {
                const schema = await inferQueryDefSchema( { expr: undefined } );
                await expect(schema.root.childrenCount).toBe(0);
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
                await expect(schema.root.findNode("@count")).resolves.toMatchObject({ name:"@count", type:"long" });
                await expect(schema.root.findNode("struct/@count")).resolves.toBeUndefined();
            });

            it("Should support analyze attribute", async () => {
                const schema = await inferQueryDefSchema([ { expr: "@state", analyze: true }]);
                await expect(schema.root.findNode("@state")).resolves.toMatchObject({ name:"@state", type:"byte" });
                await expect(schema.root.findNode("@stateName")).resolves.toMatchObject({ name:"@stateName", type:"string" });
                await expect(schema.root.findNode("@stateLabel")).resolves.toMatchObject({ name:"@stateLabel", type:"string" });
            });

            it("Should not anything to schema if type cannot be inferred", async () => {
                // Type is an expression from which we cannot infer the type
                const schema = await inferQueryDefSchema( { expr: "xyz(@id)", alias: "@id" } );
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
            });

            //TODO: what about anyType="true"

            // TODO: a nod which ontain just a link name (ex: "delivery")
        });

        describe("Support for aliases", () => {
            it("Should support top-level aliases for top-level attributes", async () => {
                const schema = await inferQueryDefSchema( { expr: "@id", alias: "@hello" } );
                await expect(schema.root.findNode("@hello")).resolves.toMatchObject({ name:"@hello", type:"long" });
                await expect(schema.root.findNode("hello")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
            });

            it("Should support top-level aliases for top-level attributes to an entity type", async () => {
                const schema = await inferQueryDefSchema( { expr: "@id", alias: "hello" } );
                await expect(schema.root.findNode("hello")).resolves.toMatchObject({ name:"hello", type:"long" });
                await expect(schema.root.findNode("@hello")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
            });

            it("Should support top-level aliases for top-level elements (string type)", async () => {
                const schema = await inferQueryDefSchema( { expr: "textOnly", alias: "hello" } );
                await expect(schema.root.findNode("hello")).resolves.toMatchObject({ name:"hello", type:"string" });
                await expect(schema.root.findNode("@hello")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@textOnly")).resolves.toBeUndefined();
            });

            it("Should support top-level aliases for top-level elements (long type)", async () => {
                const schema = await inferQueryDefSchema( { expr: "sourceId", alias: "hello" } );
                await expect(schema.root.findNode("hello")).resolves.toMatchObject({ name:"hello", type:"long" });
                await expect(schema.root.findNode("@hello")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@sourceId")).resolves.toBeUndefined();
            });

            it("Should support top-level aliases for top-level elements to attributes (long type)", async () => {
                const schema = await inferQueryDefSchema( { expr: "sourceId", alias: "@hello" } );
                await expect(schema.root.findNode("@hello")).resolves.toMatchObject({ name:"@hello", type:"long" });
                await expect(schema.root.findNode("hello")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@sourceId")).resolves.toBeUndefined();
                await expect(schema.root.findNode("sourceId")).resolves.toBeUndefined();
            });

            it("Should support aliases for nested xpaths", async () => {
                var schema = await inferQueryDefSchema( { expr: "struct", node: { expr: "@count", alias: "@count" } });
                await expect(schema.root.findNode("@count")).resolves.toMatchObject({ name:"@count", type:"long" });
                await expect(schema.root.findNode("struct/@count")).resolves.toBeUndefined();
            });

            it("Should support aliases for nested nodes", async () => {
                var schema = await inferQueryDefSchema( { expr: "[struct/@count]", alias: "@count" } );
                await expect(schema.root.findNode("@count")).resolves.toMatchObject({ name:"@count", type:"long" });
                await expect(schema.root.findNode("struct/@count")).resolves.toBeUndefined();
            });

            it("Should create nested elements for nested aliases", async () => {
                var schema = await inferQueryDefSchema( { expr: "[struct/@count]", alias: "hello/@count" } );
                await expect(schema.root.findNode("struct/@count")).resolves.toBeUndefined();
                await expect(schema.root.findNode("@count")).resolves.toBeUndefined();
                await expect(schema.root.findNode("hello/@count")).resolves.toMatchObject({ name:"@count", type:"long" });
            });

        });

        describe("Custom type inferer", () => {
            it("Should use custom type inferer", async () => {
                // No inferer
                var schema = await inferQueryDefSchema( { expr: "lower(@id)", alias: "@id" } );
                await expect(schema.root.findNode("@id")).resolves.toBeUndefined();
                // Custom inferer
                const options = { exprTypeInferer: jest.fn() };
                options.exprTypeInferer.mockReturnValueOnce(Promise.resolve({ type: "long" }));
                var schema = await inferQueryDefSchema( { expr: "lower(@id)", alias: "@id" }, options);
                await expect(schema.root.findNode("@id")).resolves.toMatchObject({ name:"@id", type:"long" });
                expect(options.exprTypeInferer.mock.calls.length).toBe(1);
                expect(options.exprTypeInferer.mock.calls[0].length).toBe(3);
                expect(options.exprTypeInferer.mock.calls[0][0]).toMatchObject({ name:"entityCaster", isRoot:true }); // this is a temp XtkSchemaNode
                expect(options.exprTypeInferer.mock.calls[0][1]).toBe(""); // no start path
                expect(options.exprTypeInferer.mock.calls[0][2]).toBe("lower(@id)");
            });
        });

        describe("Convert intermediate representation to schema", () => {
            const convert = async (root) => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
                await client.application.getSchema("xtk:entityCaster");
                const queryDef = {
                    schema: "xtk:entityCaster",
                    operation: "get",
                    select: { node: { expr: "@id" } },
                    where: { condition: [ { expr:`@internalName='DM19'` } ] }
                  };
                const infer = new QueryDefSchemaInferer(client, queryDef, { enabled: true });
                const schema = infer._convertToSchema(root);

                client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
                await client.NLWS.xtkSession.logoff();
                return schema;
            };

            it("Should support undefined root", async () => {
                var schema = await convert();
                expect(schema.root.childrenCount).toBe(0);
                schema = await convert(null);
                expect(schema.root.childrenCount).toBe(0);
                schema = await convert({});
                expect(schema.root.childrenCount).toBe(0);
            });

            it("Should convert attributes", async () => {
                const schema = await convert({ children: { "@id":  { node: { type:"boolean" }} } });
                expect(schema.root.children).toMatchObject({ "d": 3 });
            });
        });
    });

});
