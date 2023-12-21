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
 * Unit tests for the schema data objects
 * 
 *********************************************************************************/
const { SchemaCache } = require('../src/application.js');
const { DomUtil, XPath } = require('../src/domUtil.js');
const sdk = require('../src/index.js');
const newSchema = require('../src/application.js').newSchema;
const newCurrentLogin = require('../src/application.js').newCurrentLogin;
const Mock = require('./mock.js').Mock;

describe('Application', () => {
    describe('Schemas', function() {

        describe("Root node", () =>  {

            it("No root node", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'></schema>");
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root).toBeFalsy();
            });

            it("Just the root node", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'/></schema>");
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root).toBeTruthy();
                expect(root.name).toBe("recipient");
                expect(root.label).toBe("Recipients");
            });

            it("Duplicate root nodes", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'/>
                                            <element name='recipient' label='Recipients2'/>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root).toBeTruthy();
                expect(root.name).toBe("recipient");
                expect(root.label).toBe("Recipients2");
            });

            it("Duplicate enumeration value", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration basetype="string" name="AKA">
                                                <value name="PC" value="1"/>
                                                <value name="CL2" value="2"/>
                                                <value name="CL3" value="3"/>
                                                <value name="Null" value="4"/>
                                                <value name="Null" value="NULL"/>
                                            </enumeration>
                                            <element name='recipient' label='Recipients'/>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                const enumeration = enumerations.AKA.values;
                expect(enumeration.length).toBe(4);
                expect(enumeration[0].name).toBe("PC");
                expect(enumeration[1].name).toBe("CL2");
                expect(enumeration[2].name).toBe("CL3");
                expect(enumeration[3].name).toBe("Null");
                expect(enumeration[3].value).toBe("NULL");
            });

            it("Should find root node", () => {
                const schema = sdk.TestUtil.newSchema(`
                    <schema namespace="nms" name="recipient">
                        <element name="recipient">
                            <attribute name="id" type="long"/>
                            <attribute name="name" type="string"/>
                        </element>
                    </schema>`);
                expect(schema.root).toBeTruthy();
            });

        });

        describe("isRoot", () => {
            it("Shema node is not root node", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'/></schema>");
                var schema = newSchema(xml);
                expect(schema.isRoot).toBeFalsy();
            });

            it("Should be root node", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'/></schema>");
                var schema = newSchema(xml);
                var root = schema.root;            
                expect(root.isRoot).toBe(true);
            });

            it("Should not be root node", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='lib'/><element name='recipient' label='Recipients'/></schema>");
                var schema = newSchema(xml);
                var lib = schema.children["lib"];
                expect(lib.isRoot).toBeFalsy();
            });

            it("Should not be root node (second level with same name", () => {
                var xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'><element name='recipient' label='Recipients (inner)'/></element></schema>");
                var schema = newSchema(xml);
                var root = schema.root;            
                var inner = root.children["recipient"];
                expect(inner.label).toBe("Recipients (inner)")
                expect(inner.isRoot).toBe(false);
            });
        })

        describe("Attributes", () => {

            it("Should find unique attribute", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(!!root.children.get("@email")).toBe(true);
                var email = root.children["@email"];
                expect(email).not.toBeNull();
                expect(email.name).toBe("@email");
                expect(email.type).toBe("string");
                expect(email.length).toBe(3);
            });

            it("Should not find inexistant attribute", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(!!root.children.get("email")).toBe(false);
                expect(!!root.children.get("@dummy")).toBe(false);
            });

            it("Should not find inexistant attribute (@-syntax)", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(!!root.children.get("@email")).toBe(true);
                expect(!!root.children.get("email")).toBe(false);
            });
        });

        describe('dbEnum', () => {
            it("Should find dbEnum attribute", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute dbEnum="operationNature" desc="Nature of the campaign" label="Nature"
               length="64" name="nature" type="string"/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(!!root.children.get("@nature")).toBe(true);
                var attribute = root.children["@nature"];
                expect(attribute).not.toBeNull();
                expect(attribute.dbEnum).toBe("operationNature");
                expect(attribute.type).toBe("string");
                expect(attribute.length).toBe(64);
            });
        });

        describe("Children", () => {
            it("Should browse root children", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                            <element name='lib'/>
                                        </schema>`);
                var schema = newSchema(xml);
                expect(schema.childrenCount).toBe(2);
                expect(schema.children["recipient"]).not.toBeNull();
                expect(schema.children["lib"]).not.toBeNull();
                expect(schema.children["dummy"]).toBeFalsy();
            });
        });

        describe("Find node", () =>  {

            it("Should find nodes", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' label="Email" type='string' length='3'/>
                                                <element name='country' label="Country">
                                                    <attribute name='isoA3' label="Country name" type='string' length='3'/>
                                                    <attribute name='country-id' label="Country id" type='string' length='3'/>
                                                    <element name="terminal" label="Terminal"/>
                                                </element>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
    
                // Relative path
                await expect(root.findNode("@email")).resolves.toMatchObject({ label: "Email" });
                await expect(root.findNode("country")).resolves.toMatchObject({ label: "Country" });
                await expect(root.findNode("country/@isoA3")).resolves.toMatchObject({ label: "Country name" });
                await expect(root.findNode("country/@country-id")).resolves.toMatchObject({ label: "Country id" });

                await expect(root.findNode("@dummy")).resolves.toBeFalsy();
                await expect(root.findNode("dummy")).resolves.toBeFalsy();
                await expect(root.findNode("dummy/@dummy")).resolves.toBeFalsy();
                await expect(root.findNode("country/@dummy")).resolves.toBeFalsy();
                await expect(root.findNode("country/dummy/@dummy")).resolves.toBeFalsy();

                // Starting from schema
                await expect(schema.findNode("recipient")).resolves.toMatchObject({ label: 'Recipients' });

                // Absolute path (/ means schema root node, not schema node)
                await expect(root.findNode("/@email")).resolves.toMatchObject({ label: "Email" });
                const country = await root.findNode("country");
                await expect(country.findNode("/@email")).resolves.toMatchObject({ label: "Email" });
                await expect(country.findNode("/country")).resolves.toMatchObject({ label: "Country" });

                // Self and parent
                await expect(country.findNode("./@isoA3")).resolves.toMatchObject({ label: "Country name" });
                await expect(country.findNode("../@email")).resolves.toMatchObject({ label: "Email" });
                await expect(country.findNode(".././@email")).resolves.toMatchObject({ label: "Email" });
                await expect(country.findNode("./../@email")).resolves.toMatchObject({ label: "Email" });
                await expect(root.findNode("./country/..")).resolves.toMatchObject({ label: "Recipients" });

                // Special cases
                await expect(root.findNode("")).resolves.toMatchObject({ label: "Recipients" });
                await expect(root.findNode(".")).resolves.toMatchObject({ label: "Recipients" });

                // Non strict
                await expect(root.findNode("country/@isoA3", false, false)).resolves.toMatchObject({ label: "Country name" });
                await expect(root.findNode("country/isoA3", false, false)).resolves.toBeFalsy();
                await expect(country.findNode("@isoA3", false, false)).resolves.toMatchObject({ label: "Country name" });
                await expect(country.findNode("isoA3", false, false)).resolves.toBeFalsy();
                await expect(country.findNode("@terminal", false, false)).resolves.toBeFalsy();
                await expect(country.findNode("terminal", false, false)).resolves.toMatchObject({ label: "Terminal" });
                await expect(country.findNode("@notFound", false, false)).resolves.toBeFalsy();
                await expect(country.findNode("notFound", false, false)).resolves.toBeFalsy();
            });
    
            it("Empty or absolute path requires a schema and root node", async () => {

                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                            <element name='profile' label='Recipients'>
                                <attribute name='email' label="Email" type='string' length='3'/>
                                <element name='country' label="Country">
                                    <attribute name='isoA3' label="Country name" type='string' length='3'/>
                                    <attribute name='country-id' label="Country id" type='string' length='3'/>
                                </element>
                            </element>
                        </schema>`);
                var schemaNoRoot = newSchema(xml);
                var root = schemaNoRoot.root;
                expect(root).toBeUndefined();
                await expect(schemaNoRoot.findNode("")).resolves.toBeFalsy();
                await expect(schemaNoRoot.findNode("/")).resolves.toBeFalsy();

                var profile = await schemaNoRoot.findNode("profile");
                expect(profile).toBeTruthy();
                await expect(profile.findNode("country/@isoA3")).resolves.toMatchObject({ label: "Country name" });
                await expect(profile.findNode("/country/@isoA3")).resolves.toBeFalsy();
                await expect(profile.findNode("")).resolves.toBeFalsy();
            });
    
            it("Should find node by xpath", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' label="Email" type='string' length='3'/>
                                                <element name='country' label="Country">
                                                    <attribute name='isoA3' label="Country name" type='string' length='3'/>
                                                    <attribute name='country-id' label="Country id" type='string' length='3'/>
                                                </element>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
    
                await expect(root.findNode(new XPath("@email"))).resolves.toMatchObject({ label: "Email" });
            });
        });

        describe("Enumerations", () => {
            it("Should list enumerations", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte"/>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                expect(enumerations.gender.dummy).toBeFalsy();
                expect(enumerations.gender.shortName).toBe("gender");
                expect(enumerations.status.shortName).toBe("status");
                expect(enumerations.gender.name).toBe("nms:recipient:gender");
                expect(enumerations.status.name).toBe("nms:recipient:status");
            });

            it("Should support forEach and map", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte"/>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;

                // Use forEach to concatenate enumeration names
                let cat = "";
                enumerations.forEach(e => cat = cat + e.name);
                expect(cat).toBe("nms:recipient:gendernms:recipient:status");

                // Use map to get get an array of enumeration names
                expect(enumerations.map(e => e.name).join(',')).toBe("nms:recipient:gender,nms:recipient:status");
            });

            it("Should support index based access", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte"/>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                expect(enumerations[0].name).toBe("nms:recipient:gender");
                expect(enumerations[1].name).toBe("nms:recipient:status");

                // Use a for-loop
                let cat = "";
                for (let i=0; i<enumerations.length; i++)
                    cat = cat + enumerations[i].name;
                expect(cat).toBe("nms:recipient:gendernms:recipient:status");

                // Use the for ... of iterator
                cat = "";
                for (const enumeration of enumerations)
                    cat = cat + enumeration.name;
            });
            
            it("Should set default label", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                                <enumeration name="gender" basetype="byte"/>
                                                <enumeration name="status" basetype="byte" label="Status code"/>
                                                <element name='recipient' label='Recipients'></element>
                                           </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                expect(enumerations[0].label).toBe("Gender");
                expect(enumerations[1].label).toBe("Status code");
            });

            it("Should support duplicate  enumerations", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="duplicated" basetype="byte"/>
                                            <enumeration name="duplicated" basetype="byte"/>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                expect(enumerations.duplicated.dummy).toBeFalsy();
                expect(enumerations[0].label).toBe("Duplicated");
                expect(enumerations[1]).toBeUndefined();
            });

            it("Should test images", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte">
                                                <value name="male" value="0"/>
                                                <value name="female" value="1"/>                                    
                                            </enumeration>
                                            <enumeration name="status" basetype="byte">
                                                <value name="prospect" label="Prospect" value="0" img="xtk:prospect"/>
                                                <value name="customer" label="Client"   value="1"/>                                    
                                            </enumeration>
                                            <enumeration name="status2" basetype="byte">
                                                <value name="prospect" label="Prospect" value="0" img=""/>
                                                <value name="customer" label="Client"   value="1" img=""/>
                                            </enumeration>
                                            <element name='recipient' label='Recipients'>
                                            <attribute advanced="true" desc="Recipient sex" enum="nms:recipient:gender"
                                                label="Gender" name="gender" sqlname="iGender" type="byte"/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                // no img attribute
                expect(enumerations.gender.name).toBe("nms:recipient:gender");
                expect(enumerations.gender.hasImage).toBe(false);
                // at least one img attribute
                expect(enumerations.status.name).toBe("nms:recipient:status");
                expect(enumerations.status.hasImage).toBe(true);
                // at least one img attribute
                expect(enumerations.status2.name).toBe("nms:recipient:status2");
                expect(enumerations.status2.hasImage).toBe(false);
                expect(schema.root.children["@gender"].enum).toBe("nms:recipient:gender");
            })

            it("Should list enumeration values", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte">
                                                <value name="prospect" label="Prospect" value="0"/>
                                                <value name="customer" label="Client"   value="1"/>                                    
                                            </enumeration>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                expect(enumerations.status.values.prospect.label).toBe("Prospect");
                expect(enumerations.status.values.customer.label).toBe("Client");
            })

            it("Should support forEach and map on enumeration values", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte">
                                                <value name="prospect" label="Prospect" value="0"/>
                                                <value name="customer" label="Client"   value="1"/>                                    
                                            </enumeration>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                const status = enumerations.status.values;

                
                // Use forEach to concatenate enumeration names
                let cat = "";
                status.forEach(e => cat = cat + e.name);
                expect(cat).toBe("prospectcustomer");

                // Use map to get get an array of enumeration names
                expect(status.map(e => e.name).join(',')).toBe("prospect,customer");
            });


            it("Should support index based access", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte">
                                                <value name="prospect" label="Prospect" value="0"/>
                                                <value name="customer" label="Client"   value="1"/>                                    
                                            </enumeration>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                const status = enumerations.status.values;
                expect(status[0].name).toBe("prospect");
                expect(status[1].name).toBe("customer");
            });

            it("Should set default label", () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <enumeration name="status" basetype="byte">
                                                <value name="prospect" value="0"/>
                                                <value name="customer" label="Client"   value="1"/>                                    
                                            </enumeration>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                const schema = newSchema(xml);
                const enumerations = schema.enumerations;
                const status = enumerations.status.values;
                expect(status[0].label).toBe("Prospect");
                expect(status[1].label).toBe("Client");
            });

            it("Byte enumerations", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration basetype="byte" name="instanceType">
                                                <value label="One-off event" name="single" value="0"/>
                                                <value label="Reference recurrence" name="master" value="1"/>
                                                <value label="Instance of a recurrence" name="instance" value="2"/>
                                                <value label="Exception to a recurrence" name="exception" value="3"/>
                                            </enumeration>        
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                expect(enumerations.instanceType.values.single.label).toBe("One-off event");
                expect(enumerations.instanceType.values.single.value).toBe(0);
            })

            it("Should support default values", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration basetype="byte" name="instanceType" default="master">
                                                <value label="One-off event" name="single" value="0"/>
                                                <value label="Reference recurrence" name="master" value="1"/>
                                                <value label="Instance of a recurrence" name="instance" value="2"/>
                                                <value label="Exception to a recurrence" name="exception" value="3"/>
                                            </enumeration>        
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
                var schema = newSchema(xml);
                var enumerations = schema.enumerations;
                expect(enumerations.instanceType.default.value).toBe(1);
            });

            describe("Using application.getSysEnum", () => {
                
                it("Should find simple enumeration (from schema id)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                    <enumeration basetype="byte" name="instanceType" default="master" label="Instance type">
                                        <value label="One-off event" name="single" value="0"/>
                                        <value label="Reference recurrence" name="master" value="1"/>
                                        <value label="Instance of a recurrence" name="instance" value="2"/>
                                        <value label="Exception to a recurrence" name="exception" value="3"/>
                                        </enumeration>        
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const enumeration = await client.application.getSysEnum("instanceType", "nms:profile");
                    expect(enumeration.label).toBe("Instance type");
                });

                it("Should find node enumeration", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                    <enumeration basetype="byte" name="instanceType" default="master" label="Instance type">
                                        <value label="One-off event" name="single" value="0"/>
                                        <value label="Reference recurrence" name="master" value="1"/>
                                        <value label="Instance of a recurrence" name="instance" value="2"/>
                                        <value label="Exception to a recurrence" name="exception" value="3"/>
                                    </enumeration>        
                                    <element name="profile">
                                        <attribute name="e" enum="instanceType"/>
                                        <attribute name="a"/>
                                    </element>
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const schema = await client.application.getSchema("nms:profile");
                    const e = await schema.findNode('/@e');
                    expect(e.enum).toBe("instanceType");
                    let enumeration = await e.enumeration();
                    expect(enumeration.name).toBe("nms:profile:instanceType");
                    // It's possible to pass the name
                    enumeration = await e.enumeration("instanceType");
                    expect(enumeration.name).toBe("nms:profile:instanceType");
                    // Should support the case when attirbute is not an enumeration
                    const a = await schema.findNode('/@a');
                    enumeration = await a.enumeration("instanceType");
                    expect(enumeration.name).toBe("nms:profile:instanceType");
                    enumeration = await a.enumeration();
                    expect(enumeration).toBeUndefined();
                });

                it("Should find simple enumeration (from schema)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                    <enumeration basetype="byte" name="instanceType" default="master" label="Instance type">
                                        <value label="One-off event" name="single" value="0"/>
                                        <value label="Reference recurrence" name="master" value="1"/>
                                        <value label="Instance of a recurrence" name="instance" value="2"/>
                                        <value label="Exception to a recurrence" name="exception" value="3"/>
                                        </enumeration>        
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const schema = await client.application.getSchema("nms:profile");
                    const enumeration = await client.application.getSysEnum("instanceType", schema);
                    expect(enumeration.label).toBe("Instance type");
                });

                it("Should find fully qualified enumeration (in the same schema)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                    <enumeration basetype="byte" name="instanceType" default="master" label="Instance type">
                                        <value label="One-off event" name="single" value="0"/>
                                        <value label="Reference recurrence" name="master" value="1"/>
                                        <value label="Instance of a recurrence" name="instance" value="2"/>
                                        <value label="Exception to a recurrence" name="exception" value="3"/>
                                        </enumeration>        
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const schema = await client.application.getSchema("nms:profile");
                    const enumeration = await client.application.getSysEnum("nms:profile:instanceType", schema);
                    expect(enumeration.label).toBe("Instance type");
                });

                it("Should find fully qualified enumeration (in a different  schema)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="recipient" namespace="nms" xtkschema="xtk:schema">
                                    <element name="recipient">
                                        <attribute name="status" enum="nms:profile:instanceType"/>
                                    </element>
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const schema = await client.application.getSchema("nms:recipient");
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                    <enumeration basetype="byte" name="instanceType" default="master" label="Instance type">
                                        <value label="One-off event" name="single" value="0"/>
                                        <value label="Reference recurrence" name="master" value="1"/>
                                        <value label="Instance of a recurrence" name="instance" value="2"/>
                                        <value label="Exception to a recurrence" name="exception" value="3"/>
                                        </enumeration>        
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const node = await schema.root.findNode("@status");
                    const enumeration = await client.application.getSysEnum(node.enum, schema);
                    expect(enumeration.label).toBe("Instance type");
                });

                it("Should fail if malformed enumeration name", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <schema name="recipient" namespace="nms" xtkschema="xtk:schema">
                                    <element name="recipient">
                                        <attribute name="status" enum="nms:profile:instanceType"/>
                                    </element>
                                </schema>
                            </pdomDoc>
                        </GetEntityIfMoreRecentResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
                    const schema = await client.application.getSchema("nms:recipient");
                    await expect(client.application.getSysEnum("nms:profile", schema)).rejects.toMatchObject({ message: "Invalid enumeration name 'nms:profile': expecting {name} or {schemaId}:{name}" });
                });

                it("Should not find enumeration if schema is missing", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                    const enumeration = await client.application.getSysEnum("instanceType", "nms:profile");
                    expect(enumeration).toBeFalsy();
                });

                it("Should not find enumeration if no schema", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    let enumeration = await client.application.getSysEnum("instanceType", undefined);
                    expect(enumeration).toBeFalsy();
                    enumeration = await client.application.getSysEnum("instanceType", null);
                    expect(enumeration).toBeFalsy();
                });

                it("Should not find enumeration if schema is missing (local enum)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                    const enumeration = await client.application.getSysEnum("instanceType", "nms:profile");
                    expect(enumeration).toBeFalsy();
                });

                it("Should not find enumeration if schema is missing (fully qualified enum)", async () => {
                    const client = await Mock.makeClient();
                    client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                    await client.NLWS.xtkSession.logon();
                    client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                    const enumeration = await client.application.getSysEnum("nms:recipient:instanceType", "nms:profile");
                    expect(enumeration).toBeFalsy();
                });
            });

            it("Should support numeric enumeration with implicit value", async () => {
                // Example in xtk:dataTransfer:decimalCount
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="dataTransfer" namespace="xtk" xtkschema="xtk:schema">
                                <enumeration name="decimalCount" basetype="short">
                                    <value value="-1" name="all" label="All"/>
                                    <value name="0"/>
                                    <value name="1"/>
                                    <value name="2"/>
                                    <value name="3"/>
                                    <value name="4"/>
                                    <value name="5"/>
                                    <value name="6"/>
                                    <value name="7"/>
                                    <value name="8"/>
                                    <value name="9"/>
                                </enumeration>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const enumeration = await client.application.getSysEnum("decimalCount", "xtk:dataTransfer");
                expect(enumeration.label).toBe("DecimalCount");
                const values = enumeration.values;
                expect(values["all"].value).toBe(-1)
                expect(values["0"].value).toBe(0)
                expect(values["1"].value).toBe(1)
            });
        });

        describe("Keys", () => {
            it("Should have key", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <key name="test">
                                                    <keyfield xpath="@email"/>
                                                </key>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root.keys.test).toBeTruthy();
                expect(root.keys.test.fields["email"]).toBeFalsy();
                expect(root.keys.test.fields["@email"]).toBeTruthy();
            })

            it("Should fail if keyfield does not have xpath", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <key name="test">
                                                    <keyfield/>
                                                </key>
                                                <attribute name='email' type='string' length='3'/>
                                            </element>
                                        </schema>`);
                expect(() => { newSchema(xml) }).toThrow("keyfield does not have an xpath attribute");
            });

            it("Should ignore missing xpaths", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <key name="test">
                                                    <keyfield xpath="@nontFound"/>
                                                </key>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root.keys.test).toBeTruthy();
                expect(root.keys.test.fields["nontFound"]).toBeFalsy();
            });

            it("Should get first key (internal & external)", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <key name="key1">
                                                    <keyfield xpath="@email"/>
                                                </key>
                                                <key name="key2" internal="true">
                                                    <keyfield xpath="@id"/>
                                                </key>
                                                <attribute name='id' type='string'/>
                                                <attribute name='email' type='string'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root.firstInternalKeyDef()).toMatchObject({ name: 'key2', isInternal: true });
                expect(root.firstExternalKeyDef()).toMatchObject({ name: 'key1', isInternal: false });
                expect(root.firstKeyDef()).toMatchObject({ name: 'key2', isInternal: true });
            });

            it("Should get first key (external only)", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <key name="key1">
                                                    <keyfield xpath="@email"/>
                                                </key>
                                                <key name="key2">
                                                    <keyfield xpath="@id"/>
                                                </key>
                                                <attribute name='id' type='string'/>
                                                <attribute name='email' type='string'/>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                expect(root.firstInternalKeyDef()).toBeUndefined();
                expect(root.firstExternalKeyDef()).toMatchObject({ name: 'key1', isInternal: false });
                expect(root.firstKeyDef()).toMatchObject({ name: 'key1', isInternal: false });
            });
        });

        describe("Link", () => {
            it("Should have a link element", () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <element integrity="neutral" label="Info on the email" name="emailInfo"
                                                    target="nms:address" type="link" unbound="true">
                                                    <join xpath-dst="@address" xpath-src="@email"/>
                                                    <join xpath-dst="@dst" xpath-src="@source"/>
                                                </element>
                                            </element>
                                        </schema>`);
                var schema = newSchema(xml);
                var link = schema.root.children["emailInfo"];
                expect(link.target).toBe("nms:address");
                expect(link.integrity).toBe("neutral");
                expect(link.isUnbound()).toBe(true);
                expect(link.joins.length).toBe(2);
                expect(link.joins[0].dst).toBe("@address");
                expect(link.joins[0].src).toBe("@email");

                xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                        <element name='recipient' label='Recipients'>
                                            <element integrity="neutral" label="Info on the email" name="emailInfo"
                                                target="nms:address" type="link">
                                                <join xpath-dst="@address" xpath-src="@email"/>
                                                <join xpath-dst="@dst" xpath-src="@source"/>
                                            </element>
                                        </element>
                                    </schema>`);
                schema = newSchema(xml);
                link = schema.root.children["emailInfo"];
                expect(link.isUnbound()).toBe(false);
            });

            it("Should get target", async() => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient' label='Recipients'>
                                    <element name="country" type="link" target="nms:country"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                                <element name='country' label="The Country">
                                    <attribute name="isoA3" label="Country code"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const country = await recipient.root.findNode("country");
                expect(country.target).toBe("nms:country");
                const target = await country.linkTarget();
                expect(target.label).toBe("The Country");
            })
        });

        describe("Joins", () => {

            it("Should find join nodes", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element integrity="neutral" label="Info on the email" name="emailInfo" target="nms:address" type="link" unbound="true">
                                        <join xpath-dst="@address" xpath-src="@email"/>
                                        <join xpath-dst="@dst" xpath-src="@source"/>
                                    </element>
                                    <attribute name="email"/>
                                    <attribute name="source"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='address'>
                                <element name='address'>
                                <attribute name="dst"/>
                                <attribute name="address"/>
                            </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const address = await client.application.getSchema('nms:address');
                expect(address).toBeTruthy();

                // Check link attributes
                const link = await recipient.root.findNode("emailInfo");
                expect(link.isExternalJoin).toBe(false);

                // "joins" gives a description of the link source and destination xpaths
                expect(link.joins.length).toBe(2);
                expect(link.joins).toMatchObject([ { src: "@email", dst: "@address" }, { src: "@source", dst: "@dst" } ]);

                // "joinNodes" will lookup the corresponding nodes in the source and target schemas
                const nodes = await link.joinNodes();
                expect(nodes.length).toBe(2);
                expect(nodes[0].source).toMatchObject({ name:"@email", label: "Email" });
                expect(nodes[0].destination).toMatchObject({ name:"@address", label: "Address" });
                expect(nodes[1].source).toMatchObject({ name:"@source", label: "Source" });
                expect(nodes[1].destination).toMatchObject({ name:"@dst", label: "Dst" });
            });

            it("Should find join nodes with paths", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element name="countryLink" type="link" externalJoin="true" target="nms:country" revLink="operator" revIntegrity="normal">
                                        <join xpath-dst="@isoA2" xpath-src="location/@countryCode"/>
                                    </element>
                                    <element name="location">
                                        <attribute name="countryCode" label="Country Code"/>
                                    </element>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                                <element name='country'>
                                    <attribute name="isoA2"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const country = await client.application.getSchema('nms:country');
                expect(country).toBeTruthy();

                // Check link attributes
                const link = await recipient.root.findNode("countryLink");
                expect(link.isExternalJoin).toBe(true);

                // "joins" gives a description of the link source and destination xpaths
                expect(link.joins.length).toBe(1);
                expect(link.joins).toMatchObject([ { src: "location/@countryCode", dst: "@isoA2" } ]);

                // "joinNodes" will lookup the corresponding nodes in the source and target schemas
                const nodes = await link.joinNodes();
                expect(nodes.length).toBe(1);
                expect(nodes[0].source).toMatchObject({ name:"@countryCode", label: "Country Code" });
                expect(nodes[0].destination).toMatchObject({ name:"@isoA2", label: "IsoA2" });
            });

            it("Should support empty joins", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element name="countryLink" type="link" target="nms:country">
                                    </element>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();
                const link = await recipient.root.findNode("countryLink");
                expect(link.joins).toMatchObject([]);
                const nodes = await link.joinNodes();
                expect(nodes).toMatchObject([]);
                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const reverseLink = await link.reverseLink();
                expect(reverseLink).toBeFalsy();
            });

            it("Should support non-links", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element name="countryName" type="string">
                                    </element>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();
                const link = await recipient.root.findNode("countryName");
                expect(link.joins).toMatchObject([]);
                const nodes = await link.joinNodes();
                expect(nodes).toBeFalsy();
                const reverseLink = await link.reverseLink();
                expect(reverseLink).toBeFalsy();
            });

            it("Should support missing target schema", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element name="countryLink" type="link" target="cus:missing">
                                    </element>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();
                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const link = await recipient.root.findNode("countryLink");
                expect(link.joins).toMatchObject([]);
                const nodes = await link.joinNodes();
                expect(nodes).toMatchObject([]);
                const reverseLink = await link.reverseLink();
                expect(reverseLink).toBeFalsy();
            });

            it("Should support missing destination", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element name="countryLink" type="link" target="nms:country">
                                        <join xpath-dst="@notFound" xpath-src="@countryCode"/>
                                    </element>
                                    <attribute name="countryCode"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();
                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const link = await recipient.root.findNode("countryLink");
                expect(link.joins).toMatchObject([ { src:"@countryCode", dst:"@notFound" }]);

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                                <element name='country'>
                                    <attribute name="isoA2"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const nodes = await link.joinNodes();
                expect(nodes).toMatchObject([]);
                const reverseLink = await link.reverseLink();
                expect(reverseLink).toBeFalsy();
            });

            it("Should find the reverse link", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient'>
                                    <element advanced="true" externalJoin="true" label="Info on the email" name="emailInfo" revLink="recipient" target="nms:address" type="link" unbound="false">
                                        <join xpath-dst="@address" xpath-src="@email"/>
                                    </element>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                expect(recipient).toBeTruthy();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='address'>
                                <element name='address'>
                                    <element advanced="false" externalJoin="false" label="Recipients" name="recipient" revLink="emailInfo" target="nms:recipient" type="link" unbound="true">
                                        <join xpath-dst="@email" xpath-src="@address"/>
                                    </element>                                
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const address = await client.application.getSchema('nms:address');
                expect(address).toBeTruthy();

                // Check link attributes
                const link = await recipient.root.findNode("emailInfo");
                expect(link.isExternalJoin).toBe(true);
                expect(link.revLink).toBe("recipient");

                // Check revlink
                const revLink = await link.reverseLink();
                expect(revLink).toMatchObject({
                    isExternalJoin: false,
                    revLink: "emailInfo",
                    name: "recipient",
                    joins: [ { src:"@address", dst:"@email" }]
                });
            });
        });

        describe("getnodepath", () => {

            var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <attribute name='email' type='string' length='3'/>
                        <element name="country">
                            <attribute name='name'/>
                        </element>
                    </element>
                </schema>`);

            it("Should support nodePath property", async () => {
                var schema = newSchema(xml);
                var root = schema.root;
                var email = await root.findNode("@email");
                var country = await root.findNode("country");
                var name = await country.findNode("@name");
                expect(schema.nodePath).toBe("/recipient");
                expect(root.nodePath).toBe("/");
                expect(email.nodePath).toBe("/@email");
                expect(country.nodePath).toBe("/country");
                expect(name.nodePath).toBe("/country/@name");
            });
    
            it("_getNodePath", async () => {
                var schema = newSchema(xml);
                var root = schema.root;
                var email = await root.findNode("@email");            
                var country = await root.findNode("country");
                var name = await country.findNode("@name");

                // No parameters => absolute
                expect(schema._getNodePath()._path).toBe("/recipient");
                expect(root._getNodePath()._path).toBe("/");
                expect(email._getNodePath()._path).toBe("/@email");
                expect(country._getNodePath()._path).toBe("/country");
                expect(name._getNodePath()._path).toBe("/country/@name");        
    
                // Absolute
                expect(schema._getNodePath(true)._path).toBe("/recipient");
                expect(root._getNodePath(true)._path).toBe("/");
                expect(email._getNodePath(true)._path).toBe("/@email");
                expect(country._getNodePath(true)._path).toBe("/country");
                expect(name._getNodePath(true)._path).toBe("/country/@name");        
    
                // Relative
                expect(schema._getNodePath(false)._path).toBe("recipient");
                expect(root._getNodePath(false)._path).toBe("");
                expect(email._getNodePath(false)._path).toBe("@email");
                expect(country._getNodePath(false)._path).toBe("country");
                expect(name._getNodePath(false)._path).toBe("country/@name");        
            });
        });

        describe("Ref target", () => {
            
            it("Should follow ref", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" ref="address"/>
                    </element>
                    <element name='address'>
                        <element name="country">
                            <attribute name='name' label="Country Name"/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                // Pointing to the node with ref itself => return it
                var node = await schema.root.findNode("myAddress");
                expect(node).toMatchObject({ name:"myAddress", ref:"address", childrenCount:0 });
                // Follow ref
                let target = await node.refTarget();
                expect(target).toMatchObject({ name:"address", ref:"", childrenCount:1 });
            });

            it("Should support nodes with no ref", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='address'>
                        <element name="country">
                            <attribute name='name' label="Country Name"/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                var node = await schema.findNode("address");
                var target = await node.refTarget();
                expect(target).toBeFalsy();
            });
        });

        describe("visibleIf", () => {
            
            it("Should extract visibleIf", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" visibleIf="HasPackage('pkg')"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                // Pointing to the node with ref itself => return it
                var node = await schema.root.findNode("myAddress");
                expect(node).toMatchObject({ name:"myAddress", visibleIf:"HasPackage('pkg')", childrenCount:0 });
            });
        });

        describe("belongsTo", () => {
            
            it("Should extract belongsTo", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='delivery'>
                    <element name='delivery' label='Delivery'>
                        <attribute belongsTo="nms:deliveryOperation" defOnDuplicate="true" enum="sandboxStatus" label="Status of inclusion in the provisional calendar" name="sandboxStatus" sqlname="iSandboxStatus" type="byte"/>
                        <attribute belongsTo="cus:delivery" label="" length="255" name="hello" sqlname="sHello" type="string"/>
                        <element advanced="true" desc="Memo field containing data stored as XML" label="XML memo" name="data" sqlname="mData" type="memo"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("@sandboxStatus");
                expect(node).toMatchObject({ name:"@sandboxStatus", belongsTo:"nms:deliveryOperation", childrenCount:0 });

                var node = await schema.root.findNode("@hello");
                expect(node).toMatchObject({ name:"@hello", belongsTo:"cus:delivery", childrenCount:0 });

                var node = await schema.root.findNode("data");
                expect(node).toMatchObject({ name:"data", belongsTo:"", childrenCount:0 });
            });
        });

        describe("Links", () => {
            it("Should find link node", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="country" type="link" target="nms:country"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                var node = await schema.root.findNode("country");
                expect(node).toMatchObject({ name:"country", type:"link", childrenCount:0, target:"nms:country" });
            });

            it("Should fail on invalid link target", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="country" type="link" target="country"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                await expect(schema.root.findNode("country/@name")).rejects.toMatchObject({ message: "Cannot find target of link 'country': target is not a valid link target (missing schema id)" });
            });

            it("Should fail if link target has multiple schemas (like the owner link in nms:operation)", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="owner" type="link" target="xtk:opsecurity, xtk:operator"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                await expect(schema.root.findNode("owner/@name")).rejects.toMatchObject({ message: "Cannot find target of link 'xtk:opsecurity, xtk:operator': target has multiple schemas" });
            });

            it("Should follow link", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient' label='Recipients'>
                                    <element name="country" type="link" target="nms:country"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                                <element name='country'>
                                    <attribute name="isoA3" label="Country code"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const isoA3 = await recipient.root.findNode("country/@isoA3");
                expect(isoA3).toMatchObject({ name:"@isoA3", type:"string", label:"Country code", isAttribute:true, childrenCount:0, target:"" });
            });

            it("Should follow link pointing to a sub-element", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient' label='Recipients'>
                                    <element name="country" type="link" target="nms:country/test"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                                <element name='country'>
                                    <attribute name="isoA3" label="Country code"/>
                                    <element name="test">
                                        <attribute name="isoA3" label="Country code 2"/>
                                    </element>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const isoA3 = await recipient.root.findNode("country/@isoA3");
                expect(isoA3).toMatchObject({ name:"@isoA3", type:"string", label:"Country code 2", isAttribute:true, childrenCount:0, target:"" });
            });

            it("Should find target of non-links", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="country"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                var node = await schema.root.findNode("country");
                node = await node.linkTarget();
                expect(node).toMatchObject({ name:"recipient" });
            });

            it("Should support link target schema not found", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient' label='Recipients'>
                                    <element name="country" type="link" target="nms:country"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const isoA3 = await recipient.root.findNode("country/@isoA3");
                expect(isoA3).toBeFalsy();
            });


            it("Should support target schema with no root", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='recipient'>
                                <element name='recipient' label='Recipients'>
                                    <element name="country" type="link" target="nms:country/test"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const recipient = await client.application.getSchema('nms:recipient');
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema namespace='nms' name='country'>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const isoA3 = await recipient.root.findNode("country/@isoA3");
                expect(isoA3).toBeFalsy();
            });

            it("Should not cache temp:group: schemas", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
               
                client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                      <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                        <SOAP-ENV:Body>
                            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <group expirationDate="" folder-id="1199" id="2200" label="testlist" name="LST260" schema="nms:recipient" type="1">
                                  <extension label="email is not empty" mappingType="sql" name="query" namespace="temp">
                                    <element advanced="false" dataSource="nms:extAccount:ffda" label="email is not empty" name="query" pkSequence="" sqltable="grp2200" unbound="false">
                                      <compute-string expr=""/>
                                      <key internal="true" name="internal">
                                        <keyfield xpath="@id"/>
                                      </key>
                                      <attribute advanced="false" belongsTo="@id" label="Primary key" length="0" name="id" notNull="false" sql="true" sqlname="uId" type="uuid" xml="false"/>
                                      <element advanced="false" externalJoin="true" label="Targeting dimension" name="target" revLink="" target="nms:recipient" type="link" unbound="false">
                                        <join xpath-dst="@id" xpath-src="@id"/>
                                      </element>
                                    </element>
                                  </extension>
                                </group>
                                </pdomOutput>
                            </ExecuteQueryResponse>
                        </SOAP-ENV:Body>
                      </SOAP-ENV:Envelope>`));
                const group = await client.application.getSchema('temp:group:2200');
                expect(group.label).toBe("email is not empty");

                // return updated schema with label changed
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                      <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                        <SOAP-ENV:Body>
                            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                                <group expirationDate="" folder-id="1199" id="2200" label="testlist" name="LST260" schema="nms:recipient" type="1">
                                  <extension label="email is empty" mappingType="sql" name="query" namespace="temp">
                                    <element advanced="false" dataSource="nms:extAccount:ffda" label="email is empty" name="query" pkSequence="" sqltable="grp2200" unbound="false">
                                      <compute-string expr=""/>
                                      <key internal="true" name="internal">
                                        <keyfield xpath="@id"/>
                                      </key>
                                      <attribute advanced="false" belongsTo="@id" label="Primary key" length="0" name="id" notNull="false" sql="true" sqlname="uId" type="uuid" xml="false"/>
                                      <element advanced="false" externalJoin="true" label="Targeting dimension" name="target" revLink="" target="nms:recipient" type="link" unbound="false">
                                        <join xpath-dst="@id" xpath-src="@id"/>
                                      </element>
                                    </element>
                                  </extension>
                                </group>
                                </pdomOutput>
                            </ExecuteQueryResponse>
                        </SOAP-ENV:Body>
                      </SOAP-ENV:Envelope>`));
                const group2 = await client.application.getSchema('temp:group:2200');
                expect(group2.label).toBe("email is empty");
            });
        });

        describe("Ref nodes", () => {
            it("Should follow ref elements in same schema (not qualified)", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" ref="address"/>
                    </element>
                    <element name='address'>
                        <element name="country">
                            <attribute name='name' label="Country Name"/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                // Pointing to the node with ref itself => return it
                var node = await schema.root.findNode("myAddress");
                expect(node).toMatchObject({ name:"myAddress", ref:"address", childrenCount:0 });
                // Accessing nodes following the ref
                node = await schema.root.findNode("myAddress/country");
                expect(node).toMatchObject({ name:"country", label:"Country", ref:"", childrenCount:1 });
                node = await schema.root.findNode("myAddress/country/@name");
                expect(node).toMatchObject({ name:"@name", label:"Country Name", ref:"", childrenCount:0 });
            });
            it("Should follow ref elements in same schema (fully qualified)", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" ref="nms:recipient:address"/>
                    </element>
                    <element name='address'>
                        <element name="country">
                            <attribute name='name' label="Country Name"/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                // Pointing to the node with ref itself => return it
                var node = await schema.root.findNode("myAddress");
                expect(node).toMatchObject({ name:"myAddress", ref:"nms:recipient:address", childrenCount:0 });
                // Accessing nodes following the ref
                node = await schema.root.findNode("myAddress/country");
                expect(node).toMatchObject({ name:"country", label:"Country", ref:"", childrenCount:1 });
                node = await schema.root.findNode("myAddress/country/@name");
                expect(node).toMatchObject({ name:"@name", label:"Country Name", ref:"", childrenCount:0 });
            });

            it("Should fail on malformed refs", async () => {
                // Refs should be {schemaId}:{xpath}, meaning at least two ":"
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" ref="nms:recipient"/>
                        <attribute name="firstName"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                await expect(schema.root.findNode("myAddress/@firstName")).rejects.toMatchObject({ message: "Cannot find ref target 'nms:recipient' from node '/myAddress' of schema 'nms:recipient': ref value is not correct (expeted <schemaId>:<path>)" });
            });

            it("Should support inexisting schemas", async () => {
                // The schema in the ref does not exist
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <element name="address" ref="nms:recipient:address"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");
                const address = await schema.root.findNode("address");
                expect(address.ref).toBe("nms:recipient:address");

                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const city = await schema.root.findNode("address/@city");
                expect(city).toBeFalsy();
            });

            it("Should follow ref elements in a different scheam", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <element name="address" ref="nms:recipient:address"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");
                const address = await schema.root.findNode("address");
                expect(address.ref).toBe("nms:recipient:address");

                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="recipient" namespace="nms" xtkschema="xtk:schema">
                                <element name="recipient">
                                </element>
                                <element name="address" ref="nms:recipient:address">
                                    <attribute name="city"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const city = await schema.root.findNode("address/@city");
                expect(city).toMatchObject({ name: "@city" });
            });

            it("Should find path from ref node", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <element name="myAddress" ref="address"/>
                    </element>
                    <element name='address'>
                        <element name="country">
                            <attribute name='name' label="Country Name"/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                // Pointing to the node with ref itself => return it
                var node = await schema.root.findNode("myAddress");
                expect(node).toMatchObject({ name:"myAddress", ref:"address", childrenCount:0 });
                // Follow path
                let target = await node.findNode("country/@name");
                expect(target).toMatchObject({ name:"@name", ref:"" });
            });
        });

        describe("More tests", () => {
            
            it("Should set label to name with upper case if no label", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <attribute name='email' type='string' length='3'/>
                        <element name="country">
                            <attribute name='name'/>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                var node = await root.findNode("@email");
                expect(node).toMatchObject({ name: "@email", label: "Email", description: "Email", type:"string", nodePath: "/@email" });
            });

            it("Should have the right children names", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                    <element name='recipient' label='Recipients'>
                        <attribute name='email' type='string' length='3'/>
                        <element name="email"></element>
                        <element name="country">
                            <attribute name='name'/>
                        </element>
                        <attribute name='firstName'/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                const names = schema.root.children.map(e => e.name).join(',');
                expect(names).toBe("@email,email,country,@firstName");
            });

            it("Should get compute string", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <compute-string expr="@lastName + ' ' + @firstName +' (' + @email + ')'"/>
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                    <attribute name="fullName" expr="@lastName + ' ' + @firstName"/>"
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");
                
                let node = schema;
                let cs = await node.computeString();
                expect(cs).toBe("");
                expect(node.isCalculated).toBe(false);
                
                node = schema.root;
                cs = await node.computeString();
                expect(cs).toBe("@lastName + ' ' + @firstName +' (' + @email + ')'");
                expect(node.isCalculated).toBe(false);

                node = schema.root.children.get("@fullName");
                cs = await node.computeString();
                expect(cs).toBe("@lastName + ' ' + @firstName");
                expect(node.isCalculated).toBe(true);
            });

            it("Should get node edit type", async () => {
              const client = await Mock.makeClient();
              client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
              await client.NLWS.xtkSession.logon();
              client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
              <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
              <SOAP-ENV:Body>
                  <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                      <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                          <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                              <element name="profile">
                                  <compute-string expr="@lastName + ' ' + @firstName +' (' + @email + ')'"/>
                                  <attribute name="firstName"/>
                                  <attribute name="lastName"/>
                                  <attribute name="email" edit="memo"/>
                              </element>
                          </schema>
                      </pdomDoc>
                  </GetEntityIfMoreRecentResponse>
              </SOAP-ENV:Body>
              </SOAP-ENV:Envelope>`));
              const schema = await client.application.getSchema("nms:profile");

              const node = schema.root.children.get("@email");
              const editType = node.editType;
              expect(editType).toBe("memo");
          });

            it("Should get compute string for ref nodes", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile" ref="alternate">
                                </element>
                                <element name="alternate" expr="@lastName + ' ' + @firstName +' (' + @email + ')'">
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("@lastName + ' ' + @firstName +' (' + @email + ')'");
                expect(node.isCalculated).toBe(false);
            });

            it("Should get compute string for ref nodes (missing target)", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile" ref="missing">
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("");
                expect(node.isCalculated).toBe(false);
            });

            it("Should get compute string (automatically computed))", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <key>
                                        <keyfield xpath="@email"/>
                                        <keyfield xpath="@lastName"/>
                                    </key>
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("[/@email]");
                expect(node.isCalculated).toBe(false);
            });

            it("Should get compute string (empty)", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("");
                expect(node.isCalculated).toBe(false);
            });

            it("Should get compute string (empty key)", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <key></key>
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("");
                expect(node.isCalculated).toBe(false);
            });

            it("Should get compute string (invalid key)", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                <SOAP-ENV:Body>
                    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <schema name="profile" namespace="nms" xtkschema="xtk:schema">
                                <element name="profile">
                                    <key>
                                        <keyfield xpath="@notFound"/>
                                    </key>
                                    <attribute name="firstName"/>
                                    <attribute name="lastName"/>
                                    <attribute name="email"/>
                                </element>
                            </schema>
                        </pdomDoc>
                    </GetEntityIfMoreRecentResponse>
                </SOAP-ENV:Body>
                </SOAP-ENV:Envelope>`));
                const schema = await client.application.getSchema("nms:profile");                
                const node = schema.root;
                const cs = await node.computeString();
                expect(cs).toBe("");
                expect(node.isCalculated).toBe(false);
            });
        });

        describe("Type ANY", () => {
            it("Should find ANY node", async () => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='group'>
                    <element name='group'>
                        <element name="extension" type="ANY" label="Extension data" xml="true" doesNotSupportDiff="true"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);
                var root = schema.root;
                var node = await root.findNode("extension");
                expect(node).toMatchObject({ name: "extension", label: "Extension data", nodePath: "/extension", type: "ANY" });

                // xpath inside ANY node are not supported
                node = await root.findNode("extension/group");
                expect(node).toBeFalsy();
            });
        });

        describe("default values", () => {
            
            it("Should extract default", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <attribute default="true" label="In simulation mode:  execute" name="runOnsimulation" type="boolean" xml="true"/>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("@runOnsimulation");
                expect(node).toMatchObject({ name:"@runOnsimulation", childrenCount:0, default: 'true' });
            });

            it("Should extract default values of a collection of elements", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <element name="fork" label="Fork">
                            <element label="Transitions" name="transitions" xml="true">
                                <element label="transition" name="transition" ref="transition" unbound="true" xml="true">
                                    <default>
                                       &lt;transition name="transition1" enabled="true"/&gt;
                                       &lt;transition name="transition2" enabled="true"/&gt;
                                    </default>
                                </element>
                            </element>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("fork/transitions/transition");
                expect(node).toMatchObject({ name:"transition", childrenCount:0, default: [
                    {
                      "enabled": "true",
                      "name": "transition1"
                    },
                    {
                      "enabled": "true",
                      "name": "transition2"
                    }
                  ] });
            });

            it("Should extract default values of a memo", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <element name="directorywatcher" label="File collector">
                            <element name="period" type="memo" label="Schedule">
                                <default>"m_abDay='7' m_abDay[0]='0' m_abDay[1]='0'"</default>
                            </element>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("directorywatcher/period");
                expect(node).toMatchObject({ name:"period", childrenCount:0, default: "\"m_abDay='7' m_abDay[0]='0' m_abDay[1]='0'\"" });
            });

            it("Should extract translated default values of a memo", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <element name="directorywatcher" label="File collector">
                            <element name="period" type="memo" label="Schedule">
                                <translatedDefault>"m_abDay='7' m_abDay[0]='0' m_abDay[1]='0'"</translatedDefault>
                            </element>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("directorywatcher/period");
                expect(node).toMatchObject({ name:"period", childrenCount:0, translatedDefault: "\"m_abDay='7' m_abDay[0]='0' m_abDay[1]='0'\"" });
            });

            it("Should extract translatedDefault attribute", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <element name="delivery" label="Delivery">
                            <element label="Transitions" name="transitions" xml="true">
                                <element label="transition" name="done" xml="true">
                                    <attribute label="Label" name="label" type="string" translatedDefault="'Ok'" xml="true"/>
                                </element>
                            </element>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("delivery/transitions/done/@label");
                expect(node).toMatchObject({ name:"@label", childrenCount:0, translatedDefault: "'Ok'" });
            });

            it("Should extract translatedDefault element", async () => {
                var xml = DomUtil.parse(`<schema namespace='xtk' name='workflow'>
                    <element name='workflow' label='Workflow'>
                        <element name="extract" label="Split">
                            <element label="Transitions" name="transitions" xml="true">
                                <element name="extractOutput" ordered="true" template="nms:workflow:extractOutput" unbound="true">
                                     <translatedDefault>&lt;extractOutput enabled="true" label="Segment" name="subSet" &gt;
                                     &lt;limiter type="percent" percent="10" random="true"/&gt;
                                     &lt;filter enabled="true"/&gt;
                                     &lt;/extractOutput&gt;</translatedDefault>
                                </element>
                            </element>
                        </element>
                    </element>
                </schema>`);
                var schema = newSchema(xml);

                var node = await schema.root.findNode("extract/transitions/extractOutput");
                expect(node).toMatchObject(
                    { translatedDefault: [
                        {
                            enabled: "true", name:"subSet", 
                            limiter: { 
                                type: 'percent',
                                percent: '10',
                                random: 'true'
                            }
                        }] 
                    });
            });

        });

        describe("toString", () => {
            var xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="Recipients" labelSingular="Recipient">
                    <element name='recipient'>
                        <attribute name='email' type='string' length='3'/>
                        <element name="country">
                            <attribute name='name'/>
                        </element>
                    </element>
                </schema>`);

            it("Should stringify schema or schema node", async () => {
                var schema = newSchema(xml);
                var root = schema.root;
                var email = await root.findNode("@email");
                var country = await root.findNode("country");
                var name = await country.findNode("@name");

                expect(schema.toString()).toBe(`Recipients (recipient)
    - Recipient (recipient)
        - Email (@email)
        - Country (country)
            - Name (@name)
`);
                expect(root.toString()).toBe(`Recipient (recipient)
    Email (@email)
    Country (country)
        Name (@name)
`);
                expect(email.toString()).toBe("Email (@email)\n");
                expect(country.toString()).toBe("Country (country)\n    Name (@name)\n");
                expect(name.toString()).toBe("Name (@name)\n");
            });
        })

        describe("Node properties", () => {
            it("Should have isSQL" , async () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="Recipients" labelSingular="Recipient">
                    <element name='recipient' sqltable="NmsRecipient">
                        <attribute name='email' type='string' sqlname="semail"/>
                        <attribute name='test' type='string' xml="true"/>
                    </element>
                </schema>`);
                const schema = newSchema(xml);
                expect(schema.root.isSQL).toBe(true);
                let node = await schema.root.findNode("@email");
                expect(node.isSQL).toBe(true);
                node = await schema.root.findNode("@test");
                expect(node.isSQL).toBe(false);
            });

            it("Should have isSQL for link" , async () => {
                let xml = DomUtil.parse(`<schema namespace='nms' name='recipient' mappingType="sql">
                    <element name='recipient' sqltable="NmsRecipient">
                        <element name='country' type='link'/>
                    </element>
                </schema>`);
                let schema = newSchema(xml);
                let node = await schema.root.findNode("country");
                expect(node.isSQL).toBe(true);

                // not a sql mapping type
                xml = DomUtil.parse(`<schema namespace='nms' name='recipient' mappingType="file">
                    <element name='recipient' sqltable="NmsRecipient">
                        <element name='country' type='link'/>
                    </element>
                </schema>`);
                schema = newSchema(xml);
                node = await schema.root.findNode("country");
                expect(node.isSQL).toBe(false);

                // xml link
                xml = DomUtil.parse(`<schema namespace='nms' name='recipient' mappingType="sql">
                    <element name='recipient' sqltable="NmsRecipient">
                        <element name='country' type='link' xml="true"/>
                    </element>
                </schema>`);
                schema = newSchema(xml);
                node = await schema.root.findNode("country");
                expect(node.isSQL).toBe(false);
            });

            it("Should have isSQL even if it also has isXML", async () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='delivery' mappingType="sql">
                    <element name='delivery' sqltable="NmsDelivery">
                        <element name='properties'>
                            <attribute name="midAccountUsedName" type="string" xml="true"/>
                            <attribute name="seedProcessed" sqlname="iSeedProcessed" type="long" xml="true"/>
                        </element>
                    </element>
                </schema>`);
                const schema = newSchema(xml);
                const properties = await schema.root.findNode("properties");
                expect(properties.isSQL).toBe(false);
                // xml only node is not sql
                const midAccountUsedName = await properties.findNode("@midAccountUsedName");
                expect(midAccountUsedName.isSQL).toBe(false);
                expect(midAccountUsedName.isMappedAsXML).toBe(true);
                // node may be both xml and sql. If that's the case, it's considered sql
                const seedProcessed = await properties.findNode("@seedProcessed");
                expect(seedProcessed.isSQL).toBe(true);
                expect(seedProcessed.isMappedAsXML).toBe(true);
            });

            it("Should be memo and memo data" , async () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="Recipients" labelSingular="Recipient">
                    <element name='recipient' sqltable="NmsRecipient">
                        <attribute name='email' type='string' sqlname="semail"/>
                        <attribute name='test' type='string' xml="true"/>
                        <attribute name='memo' type='memo'/>
                        <element name='data' type='memo' xml="true"/>
                    </element>
                </schema>`);
                const schema = newSchema(xml);
                let node = await schema.root.findNode("@email");
                expect(node.isMemo).toBe(false);
                expect(node.isMemoData).toBe(false);
                node = await schema.root.findNode("@test");
                expect(node.isMemo).toBe(false);
                expect(node.isMemoData).toBe(false);
                node = await schema.root.findNode("@memo");
                expect(node.isMemo).toBe(true);
                expect(node.isMemoData).toBe(false);
                node = await schema.root.findNode("data");
                expect(node.isMemo).toBe(true);
                expect(node.isMemoData).toBe(true);
            });

            it("Should be test isNotNull" , async () => {
                const xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="Recipients" labelSingular="Recipient">
                    <element name='recipient'>
                        <attribute name='id' type='long'/>  
                        <attribute name='b' type='byte'/>
                        <attribute name='s' type='short'/>
                        <attribute name='f' type='float'/>
                        <attribute name='d' type='double'/>
                        <attribute name='i' type='int64'/>
                        <attribute name='m' type='money'/>
                        <attribute name='p' type='percent'/>
                        <attribute name='t' type='time'/>
                        <attribute name='b0' type='boolean'/>
                        <attribute name='email' type='string'/>

                        <attribute name='snn' type='string'/>
                        <attribute name='snnt' type='string' notNull='true'/>
                        <attribute name='snnf' type='string' notNull='false'/>

                        <attribute name='lnn' type='long'/>
                        <attribute name='lnnt' type='long' notNull='true'/>
                        <attribute name='lnnf' type='long' notNull='false'/>
                    </element>
                </schema>`);
                const schema = newSchema(xml);
                let node = await schema.root.findNode("@email"); expect(node.isNotNull).toBe(false);
                node = await schema.root.findNode("@id"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@b"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@s"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@f"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@d"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@i"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@m"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@p"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@t"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@b0"); expect(node.isNotNull).toBe(true);

                node = await schema.root.findNode("@snn"); expect(node.isNotNull).toBe(false);
                node = await schema.root.findNode("@snnt"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@snnf"); expect(node.isNotNull).toBe(false);

                node = await schema.root.findNode("@lnn"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@lnnt"); expect(node.isNotNull).toBe(true);
                node = await schema.root.findNode("@lnnf"); expect(node.isNotNull).toBe(false);
            });

            it("Should test user description" , async () => {
                let xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="Recipients" labelSingular="Recipient">
                    <element name='recipient'>
                    </element>
                </schema>`);
                let schema = newSchema(xml);
                expect(schema.userDescription).toBe("Recipients (recipient)");

                xml = DomUtil.parse(`<schema namespace='nms' name='recipient' label="recipient">
                    <element name='recipient'>
                    </element>
                </schema>`);
                schema = newSchema(xml);
                expect(schema.userDescription).toBe("recipient");
            });
        });

        describe("Translation ids", () => {
          it("schema should not have label localization id when label does not exist", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'/></schema>");
            const schema = newSchema(xml);
            expect(schema.labelLocalizationId).toBeUndefined();
            expect(schema.descriptionLocalizationId).toBeUndefined();
          });

          it("schema should have a correct label localization id", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient' label='Recipients' desc='Recipient table(profiles)'><element name='recipient' label='Recipients'/></schema>");
            const schema = newSchema(xml);
            expect(schema.labelLocalizationId).toBe('nms__recipient__@label');
            expect(schema.descriptionLocalizationId).toBe('nms__recipient__@desc');
          });

          it("schema should have a correct singular label localization id", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient' labelSingular='Recipient'><element name='recipient' label='Recipients'/></schema>");
            const schema = newSchema(xml);
            expect(schema.labelSingularLocalizationId).toBe('nms__recipient__@labelSingular');
          });

          it("schema should not have singular label localization id when singular label does not exist", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients'/></schema>");
            const schema = newSchema(xml);
            expect(schema.labelSingularLocalizationId).toBeUndefined();
          });

          it("root node should have a correct label localization id", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients' desc='Recipients'/></schema>");
            const schema = newSchema(xml);
            const root = schema.root;
            expect(root.labelLocalizationId).toBe('nms__recipient__e____recipient__@label');
            expect(root.descriptionLocalizationId).toBe('nms__recipient__e____recipient__@desc');
          });
            
          it("root node should have the label localization id when label exist but description does not exist", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='recipient' label='Recipients' /></schema>");
            const schema = newSchema(xml);
            const root = schema.root;
            expect(root.labelLocalizationId).toBe('nms__recipient__e____recipient__@label');
            expect(root.descriptionLocalizationId).toBe('nms__recipient__e____recipient__@label');
          });
            
          it("child node should have a correct label localization id", () => {
            const xml = DomUtil.parse("<schema namespace='nms' name='recipient'><element name='lib' label='library' desc='library'/><element name='recipient' label='Recipients'/></schema>");
            const schema = newSchema(xml);
            const lib = schema.children["lib"];
            expect(lib.labelLocalizationId).toBe('nms__recipient__e____lib__@label');
            expect(lib.descriptionLocalizationId).toBe('nms__recipient__e____lib__@desc');
          });

          it("attribute should have a correct label localization id", () => {
            const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'>
                                                <attribute name='email' type='string' label='email'  desc='email' length='3'/>
                                            </element>
                                        </schema>`);
            const schema = newSchema(xml);
            const root = schema.root;
            expect(root.children.get("@email").labelLocalizationId).toBe('nms__recipient__e____recipient__email__@label');
            expect(root.children.get("@email").descriptionLocalizationId).toBe('nms__recipient__e____recipient__email__@desc');
          });

          it("Enumeration should have a correct label localization id", () => {
            const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte"/>
                                            <element name='recipient' label='Recipients'></element>
                                        </schema>`);
            const schema = newSchema(xml);
            const enumerations = schema.enumerations;
            expect(enumerations.gender.labelLocalizationId).toBe('nms__recipient__gender__@label');
            expect(enumerations.gender.descriptionLocalizationId).toBe('nms__recipient__gender__@desc');
          });

          it("Enumeration value should have a correct label localization id", () => {
            const xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <enumeration name="gender" basetype="byte">
                                                <value name="male" value="0"/>
                                                <value name="female" value="1"/>                                    
                                            </enumeration>
                                            <element name='recipient' label='Recipients'>
                                            <attribute advanced="true" desc="Recipient sex" enum="nms:recipient:gender"
                                                label="Gender" name="gender" sqlname="iGender" type="byte"/>
                                            </element>
                                        </schema>`);
            const schema = newSchema(xml);
            const enumerations = schema.enumerations;
            expect(enumerations.gender.values.male.labelLocalizationId).toBe('nms__recipient__gender__male__@label');
            expect(enumerations.gender.values.male.descriptionLocalizationId).toBe('nms__recipient__gender__male__@desc');
          })
        });
    });

    describe("CurrentLogin", () => {

        it("Should create with SimpleJson", () => {
            var op = newCurrentLogin({
                login: "alex", 
                loginId: "12",
                loginCS: "Alex",
                timezone: "Europe/Paris",
                "login-right": [
                ],
                instanceLocale: "en"
            })
            expect(op.login).toBe("alex");
            expect(op.id).toBe(12);
            expect(op.computeString).toBe("Alex");
            expect(op.timezone).toBe("Europe/Paris");
            expect(op.rights).toEqual([]);
            expect(op.instanceLocale).toBe("en");
        })

        it("Should support missing 'login-right' node", () => {
            var op = newCurrentLogin({ login: "alex",  loginId: "12", loginCS: "Alex" })
            expect(op.rights).toEqual([]);
            expect(op.hasRight("admin")).toBe(false);
        })

        it("Should support 'login-right' as an object", () => {
            var op = newCurrentLogin({ login: "alex",  loginId: "12", loginCS: "Alex", "login-right": { "right": "admin" } });
            expect(op.rights).toEqual([ "admin" ]);
            expect(op.hasRight("admin")).toBe(true);
        })

        it("Should support 'login-right' as an object", () => {
            var op = newCurrentLogin({ login: "alex",  loginId: "12", loginCS: "Alex", "login-right": [ { "right": "admin" }, { "right": "delivery" } ] });
            expect(op.rights).toEqual([ "admin", "delivery" ]);
            expect(op.hasRight("admin")).toBe(true);
            expect(op.hasRight("delivery")).toBe(true);
        })


        describe("application.getSchema", () => {
            it("Should return a XtkSchema object", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
                const schema = await client.application.getSchema("xtk:session");
                expect(schema.namespace).toBe("xtk");
                expect(schema.name).toBe("session");
            });

            it("Should handle non-existing schemas", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();

                client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
                const schema = await client.application.getSchema("xtk:dummy")
                expect(schema).toBeNull();
            })
        });

        describe("application.hasPackage", () => {
            it("Should verify if a package is installed", async () => {
                const client = await Mock.makeClient();
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                await client.NLWS.xtkSession.logon();
                expect(client.application.hasPackage("nms:core")).toBe(true);
                expect(client.application.hasPackage("nms:campaign")).toBe(true);
                expect(client.application.hasPackage("nms:dummy")).toBe(false);
                expect(client.application.hasPackage("")).toBe(false);
                expect(client.application.hasPackage(null)).toBe(false);
                expect(client.application.hasPackage(undefined)).toBe(false);
            })
        })
    });

    describe("Application for anonymous users", () => {
        it("Application objet should exist but will not have user/session info", async () => {
            const client = await Mock.makeAnonymousClient();
            expect(client.application).toBeNull();
            await client.logon();
            const application = client.application;
            expect(application).not.toBeNull();
            expect(application.buildNumber).toBeUndefined();
            expect(application.version).toBeUndefined();
            expect(application.instanceName).toBeUndefined();
            expect(application.operator).toBeUndefined();
            expect(application.package).toBeUndefined();
        })
    });

    describe("Schema Cache", () => {
        it("Should search in empty cache", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const cache = new SchemaCache(client);

            client._transport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            const schema = await cache.getSchema("xtk:queryDef");
            expect(schema.id).toBe("xtk:queryDef");

            // Second call should not perform any API call
            const schema2 = await cache.getSchema("xtk:queryDef");
            expect(schema2.id).toBe("xtk:queryDef");
        });

        it("Should support not found schemas", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const cache = new SchemaCache(client);

            client._transport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            const schema = await cache.getSchema("xtk:queryDef");
            expect(schema).toBeFalsy();

            // Second call should not perform any API call
            const schema2 = await cache.getSchema("xtk:queryDef");
            expect(schema2).toBeNull();
        });
    });

    describe("Version", () => {
        it("Should get proper version information", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.application.buildNumber).toBe('9219');
            expect(client.application.version).toBe('6.7.0');
        })
    })
});

