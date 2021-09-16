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
const { DomUtil, XPath, XPathElement } = require('../src/domUtil.js');
const newSchema = require('../src/application.js').newSchema;
const newCurrentLogin = require('../src/application.js').newCurrentLogin;
const Mock = require('./mock.js').Mock;

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
            expect(() => {
                var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                            <element name='recipient' label='Recipients'/>
                                            <element name='recipient' label='Recipients2'/>
                                        </schema>`);
                newSchema(xml);    
            }).toThrow("there's a already a node");
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
            expect(root.hasChild("@email")).toBe(true);
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
            expect(root.hasChild("email")).toBe(false);
            expect(root.hasChild("@dummy")).toBe(false);
        });

        it("Should not find inexistant attribute (@-syntax)", () => {
            var xml = DomUtil.parse(`<schema namespace='nms' name='recipient'>
                                        <element name='recipient' label='Recipients'>
                                            <attribute name='email' type='string' length='3'/>
                                        </element>
                                    </schema>`);
            var schema = newSchema(xml);
            var root = schema.root;
            expect(root.hasChild("@email")).toBe(true);
            expect(root.hasChild("email")).toBe(false);
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

        it("Should find nodes", () => {
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
            expect(root.findNode("@email").label).toBe("Email");
            expect(root.findNode("country").label).toBe("Country");
            expect(root.findNode("country/@isoA3").label).toBe("Country name");
            expect(root.findNode("country/@country-id").label).toBe("Country id");

            // Not found (defaut behavior throws)
            expect(() => { root.findNode("@dummy"); }).toThrow("Unknown attribute 'dummy'");
            expect(() => { root.findNode("dummy"); }).toThrow("Unknown element 'dummy'");
            expect(() => { root.findNode("dummy/@dummy"); }).toThrow("Unknown element 'dummy'");
            expect(() => { root.findNode("country/@dummy"); }).toThrow("Unknown attribute 'dummy'");
            expect(() => { root.findNode("country/dummy/@dummy"); }).toThrow("Unknown element 'dummy'");

            // Not found (mustExists=false) 
            expect(root.findNode("@dummy", true, false)).toBeNull();
            expect(root.findNode("dummy", true, false)).toBeNull();
            expect(root.findNode("dummy/@dummy", true, false)).toBeNull();
            expect(root.findNode("country/@dummy", true, false)).toBeNull();

            // Starting from schema
            expect(schema.findNode("recipient").label).toBe('Recipients');

            // Absolute path
            expect(root.findNode("/@email").label).toBe("Email");
            const country = root.findNode("country");
            expect(country.findNode("/@email").label).toBe("Email");
            expect(country.findNode("/country").label).toBe("Country");

            // Self and parent
            expect(country.findNode("./@isoA3").label).toBe("Country name");
            expect(country.findNode("../@email").label).toBe("Email");
            expect(country.findNode(".././@email").label).toBe("Email");
            expect(country.findNode("./../@email").label).toBe("Email");
            expect(root.findNode("./country/..").label).toBe("Recipients");

            // Special cases
            expect(root.findNode("").label).toBe("Recipients");
            expect(root.findNode(".").label).toBe("Recipients");

            // Non strict
            expect(root.findNode("country/@isoA3", false, false).label).toBe("Country name");
            expect(root.findNode("country/isoA3", false, false).label).toBe("Country name");
            expect(country.findNode("@isoA3", false, false).label).toBe("Country name");
            expect(country.findNode("isoA3", false, false).label).toBe("Country name");
            expect(country.findNode("@terminal", false, false).label).toBe("Terminal");
            expect(country.findNode("terminal", false, false).label).toBe("Terminal");
            expect(country.findNode("@notFound", false, false)).toBeNull();
            expect(country.findNode("notFound", false, false)).toBeNull();
            
            // strict
            expect(root.findNode("country/@isoA3", true, false).label).toBe("Country name");
            expect(root.findNode("country/isoA3", true, false)).toBeNull();
            expect(country.findNode("@isoA3", true, false).label).toBe("Country name");
            expect(country.findNode("isoA3", true, false)).toBeNull();
            expect(country.findNode("@terminal", true, false)).toBeNull();
            expect(country.findNode("terminal", true, false).label).toBe("Terminal");
            expect(country.findNode("@notFound", true, false)).toBeNull();
            expect(country.findNode("notFound", true, false)).toBeNull();
        });


        it("Empty or absolute path requires a schema and root node", () => {
            
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
            expect(() => { schemaNoRoot.findNode("") }).toThrow("does not have a root node");
            expect(() => { schemaNoRoot.findNode("/") }).toThrow("does not have a root node");

            var profile = schemaNoRoot.findNode("profile");
            expect(profile).toBeTruthy();
            expect(profile.findNode("country/@isoA3").label).toBe("Country name");
            expect(() => { profile.findNode("/country/@isoA3") }).toThrow("does not have a root node");
            expect(() => { profile.findNode("") }).toThrow("does not have a root node");
        });

        it("Should find node by xpath", () => {
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

            expect(root.findNode(new XPath("@email")).label).toBe("Email");
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
            expect(enumerations.gender.name).toBe("gender");
            expect(enumerations.status.name).toBe("status");
        })

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
                                        <element name='recipient' label='Recipients'></element>
                                    </schema>`);
            var schema = newSchema(xml);
            var enumerations = schema.enumerations;
            // no img attribute
            expect(enumerations.gender.name).toBe("gender");
            expect(enumerations.gender.hasImage).toBe(false);
            // at least one img attribute
            expect(enumerations.status.name).toBe("status");
            expect(enumerations.status.hasImage).toBe(true);
            // at least one img attribute
            expect(enumerations.status2.name).toBe("status2");
            expect(enumerations.status2.hasImage).toBe(false);
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
                                        <enumeration basetype="byte" name="instanceType" default="1">
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
    })

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
        })
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
        var schema = newSchema(xml);
        var root = schema.root;
        var email = root.findNode("@email");            
        var country = root.findNode("country");
        var name = country.findNode("@name");

        it("Should support nodePath property", () => {
            expect(schema.nodePath).toBe("/recipient");
            expect(root.nodePath).toBe("/");
            expect(email.nodePath).toBe("/@email");
            expect(country.nodePath).toBe("/country");
            expect(name.nodePath).toBe("/country/@name");
        });

        it("_getNodePath", () => {
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


    describe("toString", () => {
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
        var email = root.findNode("@email");            
        var country = root.findNode("country");
        var name = country.findNode("@name");

        it("Should stringify schema or schema node", () => {
            expect(schema.toString()).toBe(`recipient
    - Recipients (recipient)
       - @email
       - country
          - @name
`);
            expect(root.toString()).toBe(`Recipients (recipient)
   @email
   country
      @name
`);
            expect(email.toString()).toBe("@email\n");
            expect(country.toString()).toBe("country\n   @name\n");
            expect(name.toString()).toBe("@name\n");
        });
    })

});


describe("CurrentLogin", () => {

    it("Should create with SimpleJson", () => {
        var op = newCurrentLogin({
            login: "alex", 
            loginId: "12",
            loginCS: "Alex",
            timezone: "Europe/Paris",
            "login-right": [
            ]
        })
        expect(op.login).toBe("alex");
        expect(op.id).toBe(12);
        expect(op.computeString).toBe("Alex");
        expect(op.timezone).toBe("Europe/Paris");
        expect(op.rights).toEqual([]);
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


    describe("XPath", () => {

        it("Should create XPath", () => {
            expect(new XPath("").asString()).toBe("");
            expect(new XPath(" ").asString()).toBe("");
            expect(new XPath(null).asString()).toBe("");
            expect(new XPath(undefined).asString()).toBe("");
            expect(new XPath("@name").asString()).toBe("@name");
            expect(new XPath("country/@name").asString()).toBe("country/@name");
            expect(new XPath("..").asString()).toBe("..");
            expect(new XPath(".").asString()).toBe(".");
        })

        it("toString", () => {
            expect(new XPath("").toString()).toBe("");
            expect(new XPath(" ").toString()).toBe("");
            expect(new XPath(null).toString()).toBe("");
            expect(new XPath(undefined).toString()).toBe("");
            expect(new XPath("@name").toString()).toBe("@name");
            expect(new XPath("country/@name").toString()).toBe("country/@name");
            expect(new XPath("..").toString()).toBe("..");
            expect(new XPath(".").toString()).toBe(".");
        })

        it("Should test empty XPath", () => {
            expect(new XPath("").isEmpty()).toBe(true);
            expect(new XPath(" ").isEmpty()).toBe(true);
            expect(new XPath(null).isEmpty()).toBe(true);
            expect(new XPath(undefined).isEmpty()).toBe(true);
            expect(new XPath("@name").isEmpty()).toBe(false);
            expect(new XPath("country/@name").isEmpty()).toBe(false);
            expect(new XPath("..").isEmpty()).toBe(false);
            expect(new XPath(".").isEmpty()).toBe(false);
        })

        it("Should test absolute XPath", () => {
            expect(new XPath("").isAbsolute()).toBe(false);
            expect(new XPath(" ").isAbsolute()).toBe(false);
            expect(new XPath(null).isAbsolute()).toBe(false);
            expect(new XPath(undefined).isAbsolute()).toBe(false);
            expect(new XPath("@name").isAbsolute()).toBe(false);
            expect(new XPath("country/@name").isAbsolute()).toBe(false);
            expect(new XPath("..").isAbsolute()).toBe(false);
            expect(new XPath(".").isAbsolute()).toBe(false);
            expect(new XPath("/").isAbsolute()).toBe(true);
            expect(new XPath("/country/@name").isAbsolute()).toBe(true);
        })

        it("Should test self XPath", () => {
            expect(new XPath("").isSelf()).toBe(false);
            expect(new XPath(" ").isSelf()).toBe(false);
            expect(new XPath(null).isSelf()).toBe(false);
            expect(new XPath(undefined).isSelf()).toBe(false);
            expect(new XPath("@name").isSelf()).toBe(false);
            expect(new XPath("country/@name").isSelf()).toBe(false);
            expect(new XPath("..").isSelf()).toBe(false);
            expect(new XPath(".").isSelf()).toBe(true);
            expect(new XPath("/").isSelf()).toBe(false);
            expect(new XPath("/country/@name").isSelf()).toBe(false);
        })

        it("Should test root XPath", () => {
            expect(new XPath("").isRootPath()).toBe(false);
            expect(new XPath(" ").isRootPath()).toBe(false);
            expect(new XPath(null).isRootPath()).toBe(false);
            expect(new XPath(undefined).isRootPath()).toBe(false);
            expect(new XPath("@name").isRootPath()).toBe(false);
            expect(new XPath("country/@name").isRootPath()).toBe(false);
            expect(new XPath("..").isRootPath()).toBe(false);
            expect(new XPath(".").isRootPath()).toBe(false);
            expect(new XPath("/").isRootPath()).toBe(true);
            expect(new XPath("/country/@name").isRootPath()).toBe(false);
        })

        it("Should return XPath elements", () => {

            function elements(xpath) {
                const result = [];
                const list = xpath.getElements();
                for (const e of list) {
                    result.push(e._pathElement);
                }
                return result;
            }

            expect(elements(new XPath(""))).toEqual([  ]);
            expect(elements(new XPath(" "))).toEqual([  ]);
            expect(elements(new XPath(null))).toEqual([  ]);
            expect(elements(new XPath(undefined))).toEqual([  ]);
            expect(elements(new XPath("@name"))).toEqual([ "@name" ]);
            expect(elements(new XPath("country/@name"))).toEqual([ "country", "@name" ]);
            expect(elements(new XPath(".."))).toEqual([ ".." ]);
            expect(elements(new XPath("."))).toEqual([ "." ]);
            expect(elements(new XPath("/"))).toEqual([  ]);
            expect(elements(new XPath("/country/@name"))).toEqual([ "country", "@name" ]);
        })

        it("Should get relative path", () => {
            expect(new XPath("").getRelativePath().asString()).toBe("");
            expect(new XPath(" ").getRelativePath().asString()).toBe("");
            expect(new XPath(null).getRelativePath().asString()).toBe("");
            expect(new XPath(undefined).getRelativePath().asString()).toBe("");
            expect(new XPath("@name").getRelativePath().asString()).toBe("@name");
            expect(new XPath("country/@name").getRelativePath().asString()).toBe("country/@name");
            expect(new XPath("..").getRelativePath().asString()).toBe("..");
            expect(new XPath(".").getRelativePath().asString()).toBe(".");
            expect(new XPath("/").getRelativePath().asString()).toBe("");
            expect(new XPath("/country/@name").getRelativePath().asString()).toBe("country/@name");
        })
    });

    describe("XPathElement", () => {
        it("Should create XPathElement", () => {
            expect(() => { new XPathElement(""); }).toThrow("Invalid empty xpath element");
            expect(() => { new XPathElement(" "); }).toThrow("Invalid empty xpath element");
            expect(() => { new XPathElement(null); }).toThrow("Invalid empty xpath element");
            expect(() => { new XPathElement(undefined); }).toThrow("Invalid empty xpath element");
            expect(new XPathElement("@name").asString()).toBe("@name");
            expect(new XPathElement("country").asString()).toBe("country");
            expect(new XPathElement("..").asString()).toBe("..");
            expect(new XPathElement(".").asString()).toBe(".");
        })

        it("toString", () => {
            expect(new XPathElement("@name").toString()).toBe("@name");
            expect(new XPathElement("country").toString()).toBe("country");
            expect(new XPathElement("..").toString()).toBe("..");
            expect(new XPathElement(".").toString()).toBe(".");
        })

        it("Should test if path element is self", () => {
            expect(new XPathElement("@name").isSelf()).toBe(false);
            expect(new XPathElement("country").isSelf()).toBe(false);
            expect(new XPathElement("..").isSelf()).toBe(false);
            expect(new XPathElement(".").isSelf()).toBe(true);
        })

        it("Should test if path element is the parent path (..)", () => {
            expect(new XPathElement("@name").isParent()).toBe(false);
            expect(new XPathElement("country").isParent()).toBe(false);
            expect(new XPathElement("..").isParent()).toBe(true);
            expect(new XPathElement(".").isParent()).toBe(false);
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
        expect(application.instanceName).toBeUndefined();
        expect(application.operator).toBeUndefined();
        expect(application.package).toBeUndefined();
    })
});