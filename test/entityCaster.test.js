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

 
describe('EntityCaster', function() {

    describe('Cast according to schema', () => {

        const cast = async (entity, options, beforeCastHook) => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            //client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            //const schema = await client.getSchema("xtk:entityCaster", "xml");   // preload schema
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
            const caster = new EntityCaster(client, "xtk:notFound", { enabled: true });
            await expect(caster.cast({ id: "123" })).rejects.toMatchObject({ errorCode: "SDK-000016", faultString: "Unknown schema 'xtk:notFound'" });
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
                //const hook = async (client, caster) => {
                //    client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_COUNTRY_SCHEMA_RESPONSE);
                //    await client.application.getSchema("xtk:entityCasterCountry");
                //};
                //await expect(cast({ id: "123", country: { id: "4", name: "France" } }, undefined, hook)).resolves.toEqual({ id: 123, country: { id: 4, name: "France" } });
                await expect(cast({ id: "123", country: { id: "4", name: "France" } })).resolves.toEqual({ id: 123, country: { id: 4, name: "France" } });
            });

            it("Should support links with not found target", async () => {
                //const hook = async (client, caster) => {
                //    client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                //    return await client.application.getSchema("xtk:country");
                //};
                //// The "country" link is not found => this part of the entity will not be casted
                //await expect(cast({ id: "123", country: { id: "4", name: "France" } }, undefined, hook)).resolves.toEqual({ id: 123, country: { id: "4", name: "France" } });
                await expect(cast({ id: "123", notFound: { id: "4", name: "France" } })).resolves.toEqual({ id: 123, notFound: { id: "4", name: "France" } });
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
            client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const schema = await client.application.getSchema("xtk:entityCaster");   // preload schema
            const caster = new EntityCaster(client, schema, { enabled: true });
            
            const result = await caster.cast({ id: "123" });
            expect(result).toEqual({ id: 123 }); 

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });
    });

    describe("XML to JSON with Schema help", () => {
    
        async function toJSON(xml, options, beforeCastHook) {
            if (xml && typeof xml === "string")
                xml = DomUtil.parse(xml);

            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const schema = await client.getSchema("xtk:entityCaster", "xml");   // preload schema
            if (options === undefined) options = { enabled: true };
            const caster = new EntityCaster(client, "xtk:entityCaster", options);
            if (beforeCastHook) {
                await beforeCastHook(client, caster);
            }
            const result = await caster.toJSON(xml);
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            return result;
        }

        it("Should support null and undefined", async () => {
            await expect(toJSON(undefined)).resolves.toEqual(undefined);
            await expect(toJSON(null)).resolves.toEqual(null);
        });

        it("Should support text nodes with/without child elements", async () => {
            await expect(toJSON('<root><textOnly>Hello</textOnly></root>')).resolves.toEqual({ $textOnly: "Hello" });
            await expect(toJSON('<root><textOnly> Hello</textOnly></root>')).resolves.toEqual({ $textOnly: " Hello" });
            await expect(toJSON('<root><textOnly x="1">Hello</textOnly></root>')).resolves.toEqual({ textOnly: { $:"Hello", x:"1" } });
            await expect(toJSON('<root><textOnly x="1"> Hello</textOnly></root>')).resolves.toEqual({ textOnly: { $:" Hello", x:"1" } });
        });

        it("Should support consecutive CDATA nodes", async () => {
            await expect(toJSON('<root><![CDATA[Hello]]><![CDATA[ World]]></root>')).resolves.toEqual({ $: "Hello World" });
            await expect(toJSON('<root><![CDATA[Hello]]><![CDATA[]]></root>')).resolves.toEqual({ $: "Hello" });
            await expect(toJSON('<root><![CDATA[]]><![CDATA[Hello]]></root>')).resolves.toEqual({ $: "Hello" });
        });

        it("Should convert XML to SimpleJSON", async () => {
            await expect(toJSON('<root/>')).resolves.toEqual({});
            await expect(toJSON('<root id="1"/>')).resolves.toEqual({ id:1 });
            await expect(toJSON('<root id="1" b="2"/>')).resolves.toEqual({ id:1, b:"2" });
            await expect(toJSON('<root><coll count="1"/></root>')).resolves.toEqual({ coll:[ { count: 1 }] });
            await expect(toJSON('<root><coll count="1"/><coll/></root>')).resolves.toEqual({ coll:[{ count:1 },{}] });
            await expect(toJSON('<root>Hello</root>')).resolves.toEqual({ $: "Hello" });
            await expect(toJSON('<root><textOnly>Hello</textOnly></root>')).resolves.toEqual({ $textOnly: "Hello" });
            await expect(toJSON('<root><sourceId>-123</sourceId></root>')).resolves.toEqual({ $sourceId: -123 });
            await expect(toJSON('<ctx><delivery>Hello</delivery></ctx>')).resolves.toEqual({ "$delivery": "Hello" });
            await expect(toJSON('<delivery transaction="0">0</delivery>')).resolves.toEqual({ "transaction": "0", "$": "0" });
            await expect(toJSON('<delivery attAndElem="42"><attAndElem>777</attAndElem></delivery>')).resolves.toEqual({ "@attAndElem": 42, "$attAndElem": "777" });
            await expect(toJSON('<ctx><struct>Hello<child enabled="true"/></struct></ctx>')).resolves.toEqual({struct: { "$": "Hello", child: { enabled: true } }});
            await expect(toJSON('<ctx><struct><child enabled="true"/>Hello</struct></ctx>')).resolves.toEqual({struct: { "$": "Hello", child: { enabled: true } }});
            await expect(toJSON('<ctx><struct>Hello<child enabled="true"/>World</struct></ctx>')).resolves.toEqual({struct: { "$": "HelloWorld", child: { enabled: true } }});
            await expect(toJSON('<root><book><chapter><notes><idx>4</idx><note></note></notes></chapter></book></root>')).resolves.toEqual({ book: { chapter: [ { notes: { $idx: 4, note: [{}] } } ] } });
        });

        it("Should support CDATA elements", async () => {
            await expect(toJSON('<root><![CDATA[Hello]]></root>')).resolves.toEqual({ $: "Hello" });
            await expect(toJSON('<root><![CDATA[ Hello ]]></root>')).resolves.toEqual({ $: " Hello " });
            await expect(toJSON('<root><cdata></cdata></root>')).resolves.toEqual({ $cdata: "" });
            await expect(toJSON('<root><cdata>Hello</cdata></root>')).resolves.toEqual({ $cdata: "Hello" });
            await expect(toJSON('<root><cdata> Hello </cdata></root>')).resolves.toEqual({ $cdata: " Hello " });
            await expect(toJSON('<root><cdata><![CDATA[Hello]]></cdata></root>')).resolves.toEqual({ $cdata: "Hello" });
            await expect(toJSON('<root><cdata><![CDATA[ Hello ]]></cdata></root>')).resolves.toEqual({ $cdata: " Hello " });
        });

        it("Should support html elements", async () => {
            await expect(toJSON('<root><html></html></root>')).resolves.toEqual({ $html: "" });
            await expect(toJSON('<root><html>Hello</html></root>')).resolves.toEqual({ $html: "Hello" });
            await expect(toJSON('<root><html> Hello </html></root>')).resolves.toEqual({ $html: " Hello " });
            await expect(toJSON('<root><html><![CDATA[Hello]]></html></root>')).resolves.toEqual({ $html: "Hello" });
            await expect(toJSON('<root><html><![CDATA[ Hello ]]></html></root>')).resolves.toEqual({ $html: " Hello " });
            await expect(toJSON('<root><html>&lt;!DOCTYPE html&gt;\n&lt;html&gt;\n&lt;head&gt;\n&lt;/head&gt;\n&lt;body&gt;\n&lt;p&gt;Hello &lt;strong&gt;World&lt;/strong&gt;&lt;/p&gt;\n&lt;/body&gt;\n&lt;/html&gt;</html></root>')).resolves.toEqual({ $html: "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n<p>Hello <strong>World</strong></p>\n</body>\n</html>" });
        });

        it("Should support ANY elements which are localizable (such as schema help)", async () => {
            await expect(toJSON('<root><anyLocalizable></anyLocalizable></root>')).resolves.toEqual({ $anyLocalizable: "" });
            await expect(toJSON('<root><anyLocalizable>Hello</anyLocalizable></root>')).resolves.toEqual({ $anyLocalizable: "Hello" });
            await expect(toJSON('<root><anyLocalizable> Hello </anyLocalizable></root>')).resolves.toEqual({ $anyLocalizable: " Hello " });
            await expect(toJSON('<root><anyLocalizable><![CDATA[Hello]]></anyLocalizable></root>')).resolves.toEqual({ $anyLocalizable: "Hello" });
            await expect(toJSON('<root><anyLocalizable><![CDATA[ Hello ]]></anyLocalizable></root>')).resolves.toEqual({ $anyLocalizable: " Hello " });
            await expect(toJSON('<root><static>Hello</static></root>')).resolves.toEqual({ static: { $:"Hello" } });
            await expect(toJSON('<root><static></static></root>')).resolves.toEqual({ static: { $:"" } });
            await expect(toJSON('<root><static>Hello <b>World</b></static></root>')).resolves.toEqual({ static: { $:"Hello <b>World</b>" } });
            await expect(toJSON('<root><static width="3">Hello <b>World</b></static></root>')).resolves.toEqual({ static: { $:"Hello <b>World</b>", width: 3 } });
        });

        it("Should support unfound schemas", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            const schema = await client.getSchema("xtk:notFound", "xml");   // preload schema
            const caster = new EntityCaster(client, "xtk:notFound", { enabled: true });
            await expect(caster.toJSON(DomUtil.parse('<root></root>'))).rejects.toMatchObject({ errorCode: "SDK-000016" });
        });
    });
    
    describe("Infer query schema", () => {

        const inferQueryDefSchema = async (nodes, options) => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            //client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            //await client.getSchema("xtk:entityCaster", "xml");
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
                schema: "xtk:notFound",
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
                client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
                await client.application.getSchema("xtk:entityCaster");
                const queryDef = {
                    schema: "xtk:entityCaster",
                    operation: "get",
                    select: { node: { expr: "@id" } },
                    where: { condition: [ { expr:`@internalName='DM19'` } ] }
                  };
                const infer = new QueryDefSchemaInferer(client, queryDef, { enabled: true });
                const schema = infer._convertToSchema("query",false, root);

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
                expect(schema).toMatchObject({
                    id: "temp:query", children: {
                        query: {
                            isRoot: true, name: "query",
                            childrenCount: 1,
                            children: {
                                "@id": {
                                    childrenCount: 0,
                                    name: "@id", nodePath: "/@id", isAttribute: true, type: "boolean"
                                }
                            }
                        }
                    }
                });
            });

            it("Should convert elements with value", async () => {
                const schema = await convert({ children: { "text":  { node: { type:"string" }}, "number": {node:{type:"long"}} } });
                expect(schema).toMatchObject({
                    id: "temp:query", children: {
                        query: {
                            isRoot: true, name: "query",
                            childrenCount: 2,
                            children: {
                                "text": {
                                    childrenCount: 0,
                                    name: "text", nodePath: "/text", isAttribute: false, type: "string"
                                },
                                "number": {
                                    childrenCount: 0,
                                    name: "number", nodePath: "/number", isAttribute: false, type: "long"
                                }
                            }
                        }
                    }
                });
            });

            it("Should convert element only", async () => {
                const schema = await convert({ children: { "el":  { children: { "child": {} }} } });
                expect(schema).toMatchObject({
                    id: "temp:query", children: {
                        query: {
                            isRoot: true, name: "query",
                            childrenCount: 1,
                            children: {
                                "el": {
                                    childrenCount: 1,
                                    name: "el", nodePath: "/el", isAttribute: false, type: "",
                                    children: {
                                        "child": {
                                            childrenCount: 0,
                                            name: "child", nodePath: "/el/child", isAttribute: false, type: ""
                                        },
                                    }
                                },
                            }
                        }
                    }
                });
            });
        });
    });

    describe("Caster Schema", () => {
        it("Should load caster schema", async () => {
            jest.resetAllMocks();
            const client = await Mock.makeClient({ noMockCasterSchema: true }); // do not mock the _getCasterSchema function
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._transport.mockReturnValueOnce(Mock.GET_XTK_ENTITYCASTER_SCHEMA_RESPONSE);
            const caster = new EntityCaster(client, "xtk:entityCaster", { enabled: true });
            const result = await caster.cast({ id: "123" });
            expect(result).toEqual({ id: 123 });
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            return result;
        });
    });

});
