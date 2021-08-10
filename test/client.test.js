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
 * Unit tests for the ACC client
 * 
 *********************************************************************************/

const sdk = require('../src/index.js');
const { Client, ConnectionParameters } = require('../src/client.js');
const DomUtil = require('../src/dom.js').DomUtil;
const Mock = require('./mock.js').Mock;


describe('ACC Client', function () {

    describe('Init', function () {

        it('Should create client', async function () {
            const client = await Mock.makeClient();
            const NLWS = client.NLWS;
            expect(NLWS).toBeTruthy();
            expect(client.isLogged()).toBe(false);
        });

        it('Create client with invalid parameters', () => {
            // No 4th parameter should be ok
            expect(new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin"))).not.toBeFalsy();
            // Object litteral is ok too
            expect(new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin"), {})).not.toBeFalsy();
            expect(new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin"), { representation: "BadgerFish" })).not.toBeFalsy();
            expect(new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin"), { dummy: 1 })).not.toBeFalsy();
            // Boolean is not ok
            expect(() => { new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", true)); }).toThrow("An object litteral is expected");
            expect(() => { new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", false)); }).toThrow("An object litteral is expected");
            expect(() => { new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", "BadgerFish")); }).toThrow("An object litteral is expected");
            // Invalid representation is not ok
            expect(() => { new Client(sdk, ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", { representation: "Hello" })); }).toThrow("Invalid representation");
        });

        it('Should logon and logoff', async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.isLogged()).toBe(true);
            var sessionInfoXml = client.getSessionInfo("xml");
            expect(DomUtil.findElement(sessionInfoXml, "serverInfo", true).getAttribute("buildNumber")).toBe("9219");
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
        });

        it('Should logon and logoff with traces', async () => {
            const client = await Mock.makeClient();
            client.traceSOAPCalls(true);
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.isLogged()).toBe(true);
            var sessionInfoXml = client.getSessionInfo("xml");
            expect(DomUtil.findElement(sessionInfoXml, "serverInfo", true).getAttribute("buildNumber")).toBe("9219");
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
        });

        it('Should logon and logoff with traces (as if in browser)', async () => {
            const client = await Mock.makeClient();
            client.traceSOAPCalls(true);
            client._browser = true;
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.isLogged()).toBe(true);
            var sessionInfoXml = client.getSessionInfo("xml");
            expect(DomUtil.findElement(sessionInfoXml, "serverInfo", true).getAttribute("buildNumber")).toBe("9219");
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
        });

        it('Should logon and logoff (remember me)', async () => {
            const client = await Mock.makeClient({ rememberMe: true });

            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.isLogged()).toBe(true);
            var sessionInfoXml = client.getSessionInfo("xml");
            expect(DomUtil.findElement(sessionInfoXml, "serverInfo", true).getAttribute("buildNumber")).toBe("9219");

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
        });

        it("Should support multiple logoff", async () => {
            const client = await Mock.makeClient();
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false)
        });

        it('Should fail to call if unlogged', async () => {
            const client = await Mock.makeClient();
            await client.getSchema("nms:recipient").catch(e => {
                expect(e.name).toMatch('Error');
            });
        });

        it('Should fail if logon does not return a session token', async () => {
            const client = await Mock.makeClient();
            expect(async () => {
                client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE_NO_SESSIONTOKEN);
                await client.NLWS.xtkSession.logon();
            }).rejects.toThrow();
            expect(client.isLogged()).toBe(false);
        });

        it('Should fail if logon does not return a security token', async () => {
            const client = await Mock.makeClient();
            expect(async () => {
                client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE_NO_SECURITYTOKEN);
                await client.NLWS.xtkSession.logon();
            }).rejects.toThrow();
            expect(client.isLogged()).toBe(false);
        });


        it('Should logon with dummy cookie', async () => {
            document = {};
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            expect(client.isLogged()).toBe(true);
            var sessionInfoXml = client.getSessionInfo("xml");
            expect(DomUtil.findElement(sessionInfoXml, "serverInfo", true).getAttribute("buildNumber")).toBe("9219");
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
            expect(client.isLogged()).toBe(false);
            document = undefined;
        });

        it('Should fail if Logon does not return an UserInfo struture', async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE_NO_USERINFO);
            await expect(client.NLWS.xtkSession.logon()).rejects.toThrow("userInfo structure missing");
            expect(client.isLogged()).toBe(false);
        });

        it('Should fail with invalid credentials type', async () => {
            const client = await Mock.makeClient();
            client._connectionParameters._credentials._type = "Dummy";
            expect(async () => { return client.logon() }).rejects.toThrow("Cannot logon: unsupported credentials type 'Dummy'");
        })
    });

    describe("Get session Info", () => {

        it('Should get session info with default representation', async () => {
            const client = await Mock.makeClient({ rememberMe: true });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            var sessionInfo = client.getSessionInfo();
            expect(sessionInfo.serverInfo.buildNumber).toBe("9219");
        });

        it('Should get session info with BadgerFish representation', async () => {
            const client = await Mock.makeClient({ rememberMe: true });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            var sessionInfo = client.getSessionInfo("BadgerFish");
            expect(sessionInfo.serverInfo['@buildNumber']).toBe("9219");
        });

    })

    describe('API calls', () => {
        it('Should getEntityIfMoreRecent', async () => {
            const client = await Mock.makeClient({ representation: "xml" });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const schema = await client.getEntityIfMoreRecent("xtk:schema", "xtk:session");
            var element = DomUtil.getFirstChildElement(schema);
            expect(element.nodeName).toBe("interface");
            expect(element.getAttribute("name")).toBe("persist");
            element = DomUtil.getNextSiblingElement(element);
            expect(element.nodeName).toBe("element");
            expect(element.getAttribute("name")).toBe("sessionInfo");
            element = DomUtil.getNextSiblingElement(element);
            expect(element.nodeName).toBe("element");
            expect(element.getAttribute("name")).toBe("userInfo");
            element = DomUtil.getNextSiblingElement(element);
            expect(element.nodeName).toBe("element");
            expect(element.getAttribute("name")).toBe("session");
            await client.NLWS.xtkSession.logoff();
        });

        it('Should getOption', async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            await client.NLWS.xtkSession.logon();

            // Method 1: convenience function
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            var databaseId = await client.getOption("XtkDatabaseId");
            expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            // Method 2 : SOAP call - will not use cache to get, but will cache result
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            var option = await client.NLWS.xtkSession.getOption("XtkDatabaseId");
            expect(option[0]).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            expect(option[1]).toBe(6);
            // Call again => should not perform any SOAP calls as its using the
            // cache for both the schema and the option
            var databaseId = await client.getOption("XtkDatabaseId");
            expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            // Force not using cache
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            var databaseId = await client.getOption("XtkDatabaseId", false);
            expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            // Clear cache
            client.clearOptionCache();
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            var databaseId = await client.getOption("XtkDatabaseId");
            expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");

            // Without parameters
            await client.NLWS.xtkSession.getOption().catch(e => {
                expect(e.name).toMatch('Error');
            });

            // representations
            client._representation = "json";
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            option = await client.NLWS.xtkSession.getOption("XtkDatabaseId");
            expect(option[0]).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            expect(option[1]).toBe(6);

            client._representation = "xml";
            client._soapTransport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
            option = await client.NLWS.xtkSession.getOption("XtkDatabaseId");
            expect(option[0]).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
            expect(option[1]).toBe(6);

            client._representation = "invalid";
            option = await client.NLWS.xtkSession.getOption("XtkDatabaseId").catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });


        describe("Should set option", () => {

            it("Should set option when it does not exist", async () => {
                const client = await Mock.makeClient();
                client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
                await client.NLWS.xtkSession.logon();
    
                // Setting an option for the first time will
                // - try to read the option from the database (as it's not in cache yet): xtk:session#GetOption
                // - use a writer to write the result to the database
                client._soapTransport.mockReturnValueOnce(Mock.GET_OPTION_NOTFOUND_RESPONSE);
                client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                            <SOAP-ENV:Body>
                            <WriteResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            </WriteResponse>
                            </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`));
                await client.setOption("XtkDatabaseId", "ABC");
                // Reading the option should not make any database access and read from the cache
                var databaseId = await client.getOption("XtkDatabaseId");
                expect(databaseId).toBe("ABC");
            })

            it("Should set option with description", async () => {
                const client = await Mock.makeClient();
                client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
                await client.NLWS.xtkSession.logon();
    
                // Setting an option for the first time will
                // - try to read the option from the database (as it's not in cache yet): xtk:session#GetOption
                // - use a writer to write the result to the database
                client._soapTransport.mockReturnValueOnce(Mock.GET_OPTION_NOTFOUND_RESPONSE);
                client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                            <SOAP-ENV:Body>
                            <WriteResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            </WriteResponse>
                            </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`));
                await client.setOption("XtkDatabaseId", "ABC", "This is my desc");
                // Reading the option should not make any database access and read from the cache
                var databaseId = await client.getOption("XtkDatabaseId");
                expect(databaseId).toBe("ABC");
            })

            it("Should set existing option with type", async () => {
                const client = await Mock.makeClient();
                client.traceSOAPCalls(true);
                client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
                await client.NLWS.xtkSession.logon();
    
                // Setting an option for the first time will
                // - try to read the option from the database (as it's not in cache yet): xtk:session#GetOption. In this case, it will return a numeric option
                // - use a writer to write the result to the database
                client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                        <SOAP-ENV:Body>
                            <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                                <pstrValue xsi:type='xsd:string'>-123</pstrValue>
                                <pbtType xsi:type='xsd:byte'>3</pbtType>
                            </GetOptionResponse>
                        </SOAP-ENV:Body>
                        </SOAP-ENV:Envelope>`));
                client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                            <SOAP-ENV:Body>
                            <WriteResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                            </WriteResponse>
                            </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`));
                await client.setOption("XtkDatabaseId", "7");
                // Reading the option should not make any database access and read from the cache
                var databaseId = await client.getOption("XtkDatabaseId");
                expect(databaseId).toBe(7);
            })

        })

        it("Should return missing options", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            // Get missing option
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_OPTION_NOTFOUND_RESPONSE);
            var value = await client.getOption("ZZ");
            expect(value).toBeNull();

            // Check missing option is cached too
            var value = await client.getOption("ZZ");
            expect(value).toBeNull();

            // Defense case where resulting parameters are missing. This is a forged answer, should not happen
            // in reality
            client._soapTransport.mockReturnValueOnce(Mock.GET_OPTION_MISSING_DATA_RESPONSE);
            await client.getOption("YY").catch(e => {
                expect(e.name).toMatch('Error');
            });
        });

        it("Should return schema definition", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var schema = await client.getSchema("nms:extAccount");
            expect(schema["namespace"]).toBe("nms");
            expect(schema["name"]).toBe("extAccount");

            // Ask again, should use cache
            var schema = await client.getSchema("nms:extAccount");
            expect(schema["namespace"]).toBe("nms");
            expect(schema["name"]).toBe("extAccount");

            // Clear cache and ask again
            client.clearEntityCache();
            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var schema = await client.getSchema("nms:extAccount");
            expect(schema["namespace"]).toBe("nms");
            expect(schema["name"]).toBe("extAccount");

            // Ask as XML
            var schema = await client.getSchema("nms:extAccount", "xml");
            expect(schema.getAttribute("namespace")).toBe("nms");
            expect(schema.getAttribute("name")).toBe("extAccount");

            // Ask as BadgerFish
            var schema = await client.getSchema("nms:extAccount", "BadgerFish");
            expect(schema["@namespace"]).toBe("nms");
            expect(schema["@name"]).toBe("extAccount");

            // Ask with invalid representation
            expect(async () => { client.getSchema("nms:extAccount", "invalid"); }).rejects.toThrow("Unsupported representation");

            // Get missing schema
            client.clearAllCaches();
            client._soapTransport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            var schema = await client.getSchema("nms:dummy", "BadgerFish");
            expect(schema).toBeNull();
            client.clearAllCaches();
            client._soapTransport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            var schema = await client.getSchema("nms:dummy", "xml");
            expect(schema).toBeNull();

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should return sys enum definition", async () => {
            const client = await Mock.makeClient({ representation: "BadgerFish" });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum["@basetype"]).toBe("byte");
            expect(sysEnum["@name"]).toBe("encryptionType");
            expect(sysEnum.value[0]["@name"]).toBe("none");
            expect(sysEnum.value[1]["@name"]).toBe("ssl");

            // Find sysEnum by relative name
            var sysEnum = await client.getSysEnum("encryptionType", "nms:extAccount");
            expect(sysEnum["@basetype"]).toBe("byte");
            expect(sysEnum["@name"]).toBe("encryptionType");
            expect(sysEnum.value[0]["@name"]).toBe("none");
            expect(sysEnum.value[1]["@name"]).toBe("ssl");

            // Schema name should be valid, i.e. "nms:extAccount" and not "extAccount"
            await client.getSysEnum("encryptionType", "extAccount").catch(e => {
                expect(e.name).toMatch('Error');
            });
            // Schema name must be a string
            await client.getSysEnum("encryptionType", new Date()).catch(e => {
                expect(e.name).toMatch('Error');
            });
            // With one parameter, enum name must be fully qualified, i.e. "nms:extAccount:encryptionType"
            await client.getSysEnum("encryptionType").catch(e => {
                expect(e.name).toMatch('Error');
            });
            await client.getSysEnum("extAccount:encryptionType").catch(e => {
                expect(e.name).toMatch('Error');
            });

            // Enum does not exist
            var sysEnum = await client.getSysEnum("nms:extAccount:notFound");
            expect(sysEnum).toBeUndefined();

            // Get cached XML representation
            client._representation = "xml";
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum.getAttribute("basetype")).toBe("byte");

            // Invalid representation
            const startSchema = await client.getSchema("nms:extAccount");
            client._representation = "invalid";
            await client.getSysEnum("encryptionType", startSchema).catch(e => {
                expect(e.name).toMatch('Error');
            });
            client._representation = "xml";

            // Get non-cached XML representation 
            client.clearAllCaches();
            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum.getAttribute("basetype")).toBe("byte");

            // Schema does not exist
            client.clearAllCaches();
            client._soapTransport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            await client.getSysEnum("nms:dummy:encryptionType").catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("getSysEnum should support schemas which do not have enumerations (BadgerFish representation)", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("xtk:all:encryptionType");
            expect(sysEnum).toBeUndefined();
        });

        it("getSysEnum should support schemas which do not have enumerations (SimpleJson representation)", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("xtk:all:encryptionType");
            expect(sysEnum).toBeUndefined();
        });

    });

    describe("Should return sys enum definition with the right representation", () => {
        it("Should return sys enum definition with the default representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum["basetype"]).toBe("byte");
            expect(sysEnum["name"]).toBe("encryptionType");
            expect(sysEnum.value[0]["name"]).toBe("none");
            expect(sysEnum.value[1]["name"]).toBe("ssl");
        });

        it("Should return sys enum definition with the 'BadgerFish' representation", async () => {
            const client = await Mock.makeClient({ representation: "BadgerFish" });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum["@basetype"]).toBe("byte");
            expect(sysEnum["@name"]).toBe("encryptionType");
            expect(sysEnum.value[0]["@name"]).toBe("none");
            expect(sysEnum.value[1]["@name"]).toBe("ssl");
        });

        it("Should return sys enum definition with the 'SimpleJson' representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");
            expect(sysEnum["basetype"]).toBe("byte");
            expect(sysEnum["@basetype"]).toBeUndefined();
            expect(sysEnum["name"]).toBe("encryptionType");
            expect(sysEnum.value[0]["name"]).toBe("none");
            expect(sysEnum.value[1]["name"]).toBe("ssl");
        });

        it("Should return sys enum definition with the 'xml' representation", async () => {
            const client = await Mock.makeClient({ representation: "xml" });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
            var sysEnum = await client.getSysEnum("nms:extAccount:encryptionType");

            console.log(DomUtil.toXMLString(sysEnum));

            expect(sysEnum.getAttribute("basetype")).toBe("byte");
            expect(sysEnum.getAttribute("name")).toBe("encryptionType");
            var value = DomUtil.getFirstChildElement(sysEnum, "value");
            expect(value.getAttribute("name")).toBe("none");
            value = DomUtil.getNextSiblingElement(value);
            expect(value.getAttribute("name")).toBe("ssl");
        });
    });

    describe("Get Mid Client", () => {

        it("Should get mid connection", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_MID_EXT_ACCOUNT_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_SECRET_KEY_OPTION_RESPONSE);
            var connectionParameters = await sdk.ConnectionParameters.ofExternalAccount(client, "defaultEmailMid");
            var midClient = await sdk.init(connectionParameters);
            midClient._soapTransport = jest.fn();

            midClient._soapTransport.mockReturnValueOnce(Mock.GET_LOGON_MID_RESPONSE);
            await midClient.NLWS.xtkSession.logon();

            midClient._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            midClient._soapTransport.mockReturnValueOnce(Mock.GET_TSTCNX_RESPONSE);
            await midClient.NLWS.xtkSession.testCnx();

            midClient._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await midClient.NLWS.xtkSession.logoff();
            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail to get connection for external account which is not a mid-sourcing account", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_BAD_EXT_ACCOUNT_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_SECRET_KEY_OPTION_RESPONSE);
            expect(async () => {
                return sdk.ConnectionParameters.ofExternalAccount(client, "bad");
            }).rejects.toThrow("account type 'bad' not supported");
        })

        it("Should fail if invalid representation", async () => {
            const client = await Mock.makeClient();

            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_MID_EXT_ACCOUNT_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_SECRET_KEY_OPTION_RESPONSE);

            expect(async () => {
                client._representation = "Dummy";
                var connectionParameters = await sdk.ConnectionParameters.ofExternalAccount(client, "defaultEmailMid");
                await sdk.init(connectionParameters);
            }).rejects.toThrow();
        });

        // getMidClient internally uses an object encoded in BadgerFish
        // => explicitely test with another representation
        it("Should fail not fail with SimpleJson representation", async () => {
            const client = await Mock.makeClient();
            client._representation = "SimpleJson";

            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_MID_EXT_ACCOUNT_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_SECRET_KEY_OPTION_RESPONSE);

            var connectionParameters = await sdk.ConnectionParameters.ofExternalAccount(client, "defaultEmailMid");
            await sdk.init(connectionParameters);
        });

        it("Should get cached cipher", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_SECRET_KEY_OPTION_RESPONSE);
            var cipher = await client._getSecretKeyCipher();
            expect(cipher).not.toBeNull();
            expect(cipher.key).not.toBeNull();
            expect(cipher.iv).not.toBeNull();

            // Ask again, should be cached (no mock methods)
            client.clearAllCaches();
            var cipher = await client._getSecretKeyCipher();
            expect(cipher).not.toBeNull();
            expect(cipher.key).not.toBeNull();
            expect(cipher.iv).not.toBeNull();

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });
    });


    describe("SOAP call with all parameters and return types", () => {

        it("Should call with all parameter types", async () => {
            const client = await Mock.makeClient({ representation: "BadgerFish" });

            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_TYPES_RESPONSE);

            const element = { "@type": "element", "@xtkschema": "nms:recipient" };          // @xtkschema needed to determine root name
            const document = { "@type": "document", "@xtkschema": "nms:recipient" };

            const result = await client.NLWS.xtkAll.allTypes("Hello World", true, 1, 1000, 100000, "100000", "2020-12-31T12:34:56.789Z", "2020-12-31", element, document);
            // Note: should match responses in GET_XTK_ALL_TYPES_RESPONSE
            expect(result.length).toBe(10);
            expect(result[0]).toBe("Hello World");
            expect(result[1]).toBe(true);
            expect(result[2]).toBe(1);
            expect(result[3]).toBe(1000);
            expect(result[4]).toBe(100000);
            expect(result[5]).toBe("100000");
            expect(result[6].toISOString()).toBe("2020-12-31T12:34:56.789Z");
            expect(result[7].toISOString()).toBe("2020-12-31T00:00:00.000Z");
            expect(result[8]["@type"]).toBe("element");
            expect(result[8]["@result"]).toBe("true");
            expect(result[9]["@type"]).toBe("document");
            expect(result[9]["@result"]).toBe("true");

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should check xtkschema attribute", async () => {
            const client = await Mock.makeClient();

            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_TYPES_RESPONSE);

            const element = { "@type": "element" };          // @xtkschema needed to determine root name, missing on purpose
            const document = { "@type": "document", "@xtkschema": "nms:recipient" };

            await client.NLWS.xtkAll.allTypes("Hello World", true, 1, 1000, 100000, "2020-12-31T12:34:56.789Z", "2020-12-31", element, document).catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });
        it("Should fail on unsupported type", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_ALL_SCHEMA_RESPONSE);

            // unsupported input parameter
            await client.NLWS.xtkAll.unsupportedInput().catch(e => {
                expect(e.name).toMatch('Error');
            });

            // unsupported output parameter
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_TYPE_UNSUPPORTED_TYPE_RESPONSE);
            await client.NLWS.xtkAll.unsupported().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should support local return type", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
            const userInfo = await client.NLWS.xtkSession.getUserInfo();
            expect(userInfo["login"]).toBe("admin");

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should support XML representation", async () => {
            const client = await Mock.makeClient({ representation: "xml" });
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
            const userInfo = await client.NLWS.xtkSession.getUserInfo();
            expect(userInfo.getAttribute("login")).toBe("admin");

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail if schema does not exist", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            await client.NLWS.xtkNotFound.unsupported().catch(e => {
                expect(e.name).toMatch('Error');
            });

            // Call directly
            client._soapTransport.mockReturnValueOnce(Mock.GET_MISSING_SCHEMA_RESPONSE);
            const callContext = { schemaId: "xtk:notFound" };
            await client._callMethod("dummy", callContext).catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail if method does not exist", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            await client.NLWS.xtkSession.unsupported().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail if calling non static function without object", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
            await client.NLWS.xtkSession.nonStatic().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should start workflow (hack)", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_WORKFLOW_SCHEMA_RESPONSE);
            client._soapTransport.mockImplementationOnce(options => {
                const doc = DomUtil.parse(options.body);
                const body = DomUtil.findElement(doc.documentElement, "SOAP-ENV:Body");
                const method = DomUtil.getFirstChildElement(body);
                const parameters = DomUtil.findElement(method, "parameters");
                const variables = DomUtil.getFirstChildElement(parameters, "variables");
                if (!variables)
                    throw new Error("Did not find 'variables' node");
                if (variables.getAttribute("hello") != "world")
                    throw new Error("Did not find 'hello' variable");

                return Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:workflow' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                        <SOAP-ENV:Body>
                        <StartWithParametersResponse xmlns='urn:xtk:workflow' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        </StartWithParametersResponse>
                        </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`);
            });
            await client.NLWS.xtkWorkflow.startWithParameters(4900, { "hello": "world" });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should call non static method", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_QUERY_EXECUTE_RESPONSE);
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
            var extAccounts = await query.executeQuery();

            var queryDef = DomUtil.parse(`<queryDef schema="nms:extAccount" operation="select">
                    <select>
                        <node expr="@id"/>
                        <node expr="@name"/>
                    </select>
                </queryDef>`);
            client._representation = "xml";
            client._soapTransport.mockReturnValueOnce(Mock.GET_QUERY_EXECUTE_RESPONSE);
            var query = client.NLWS.xtkQueryDef.create(queryDef);
            var extAccounts = await query.executeQuery();

            client._representation = "invalid";
            client.NLWS.xtkQueryDef.create(queryDef)
            await query.executeQuery().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();

        });

        it("Should fail to return DOMDocument with unsupported representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Mock.GET_GETDOCUMENT_RESPONSE);
            client._representation = "xml";
            var result = await client.NLWS.xtkPersist.getDocument();

            client._soapTransport.mockReturnValueOnce(Mock.GET_GETDOCUMENT_RESPONSE);
            client._representation = "invalid";
            await client.NLWS.xtkPersist.getDocument().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail to return DOMElement with unsupported representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Mock.GET_GETELEMENT_RESPONSE);
            client._representation = "xml";
            var result = await client.NLWS.xtkPersist.getElement();

            client._soapTransport.mockReturnValueOnce(Mock.GET_GETELEMENT_RESPONSE);
            client._representation = "invalid";
            await client.NLWS.xtkPersist.getElement().catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should fail to pass DOMDocument with unsupported representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);

            const document = DomUtil.parse("<root/>");
            client._soapTransport.mockReturnValueOnce(Mock.GET_SETDOCUMENT_RESPONSE);
            client._representation = "xml";
            var result = await client.NLWS.xtkPersist.setDocument(document);

            client._soapTransport.mockReturnValueOnce(Mock.GET_SETDOCUMENT_RESPONSE);
            client._representation = "invalid";
            await client.NLWS.xtkPersist.setDocument(document).catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });


        it("Should fail to pass DOMElement with unsupported representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);

            const element = DomUtil.parse("<root/>").documentElement;
            client._soapTransport.mockReturnValueOnce(Mock.GET_SETELEMENT_RESPONSE);
            client._representation = "xml";
            var result = await client.NLWS.xtkPersist.setElement(element);

            client._soapTransport.mockReturnValueOnce(Mock.GET_SETELEMENT_RESPONSE);
            client._representation = "invalid";
            await client.NLWS.xtkPersist.setElement(element).catch(e => {
                expect(e.name).toMatch('Error');
            });

            client._soapTransport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should support mutable calls", async () => {
            // Some methods can mutate the object on which they apply. This is for instance the case of the xtk:queryDef#SelectAll method. 
            // You call it on a queryDef, and it internally returns a new query definition which contain select nodes for all the nodes of the schema. 
            // When such a method is called, the SDK will know how to "mutate" the corresponding object.
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            
            var queryDef = {
                "schema": "xtk:option",
                "operation": "getIfExists",
            };
            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);
            var query = client.NLWS.xtkQueryDef.create(queryDef);

            client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
                    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
                    <SOAP-ENV:Body>
                    <SelectAllResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                        <entity xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                            <queryDef operation="get" schema="xtk:option" startPath="/" xtkschema="xtk:queryDef">
                            <select>
                            <node expr="@id" noComputeString="true"/>
                            <node expr="@name" noComputeString="true"/>
                            <node expr="@type" noComputeString="true"/>
                            <node anyType="true" expr="desc" noComputeString="true"/>
                            <node expr="@dataType" noComputeString="true"/>
                            <node expr="@stringValue" noComputeString="true"/>
                            <node expr="@longValue" noComputeString="true"/>
                            <node expr="@doubleValue" noComputeString="true"/>
                            <node expr="@timeStampValue" noComputeString="true"/>
                            <node anyType="true" expr="memoValue" noComputeString="true"/>
                            <node expr="[@createdBy-id]" noComputeString="true"/>
                            <node expr="[@modifiedBy-id]" noComputeString="true"/>
                            <node expr="@created" noComputeString="true"/>
                            <node expr="@lastModified" noComputeString="true"/>
                            </select>
                            </queryDef>
                        </entity>
                    </SelectAllResponse>
                    </SOAP-ENV:Body>
                    </SOAP-ENV:Envelope>`));
            await query.selectAll(false);
            
            // Check that query has new nodes
            const object = query.inspect();         // JSON query object
            expect(object.select.node.length).toBe(14);
        })

    });

    // Fails to use xtk:persist unless xtk:session loaded before

    describe("Issue #3", () => {

        it("getIfExists with empty result", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
            <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
            <SOAP-ENV:Body>
            <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount/>
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

            // GetIfExists should return null
            var query = client.NLWS.xtkQueryDef.create(queryDef);
            var extAccount = await query.executeQuery();
            expect(extAccount).toBeNull();
        });

        it("select with empty result", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
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
            query = client.NLWS.xtkQueryDef.create(queryDef);
            extAccount = await query.executeQuery();
            expect(extAccount).toEqual({ extAccount: [] });
        });

        it("getIfExists with a result of exactly one element", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
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
            expect(extAccount).toEqual({ "id": "1" });
        });

        it("select with a result of exactly one element", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_XTK_QUERY_SCHEMA_RESPONSE);

            client._soapTransport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
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
            expect(extAccount).toEqual({ extAccount: [{ "id": "1" }] });
        });
    })

    describe("Representations", () => {

        it("from default representation", async () => {
            const client = await Mock.makeClient();
            var xml = DomUtil.toXMLString(client.fromRepresentation("root", {}));
            expect(xml).toBe("<root/>");
        })

        it("from SimpleJson representation", async () => {
            const client = await Mock.makeClient();
            var xml = DomUtil.toXMLString(client.fromRepresentation("root", {}, "SimpleJson"));
            expect(xml).toBe("<root/>");
        })

        describe("Convert across representations ", () => {

            it("Should convert from BadgerFish to BadgerFish", async () => {
                const client = await Mock.makeClient();
                var from = { "@id": "1", "child": {} };
                var to = client.convertToRepresentation(from, "BadgerFish", "BadgerFish");
                expect(to).toStrictEqual(from);
            })

            it("Should convert from BadgerFish to SimpleJson", async () => {
                const client = await Mock.makeClient();
                var from = { "@id": "1", "child": {} };
                var to = client.convertToRepresentation(from, "BadgerFish", "SimpleJson");
                expect(to).toStrictEqual({ id: "1", child: {} });
            })


        });

        it("Compare representations", async () => {
            const client = await Mock.makeClient();
            expect(() => { client.isSameRepresentation("json", "json") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("json", "BadgerFish") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("BadgerFish", "json") }).toThrow("cannot compare");
            expect(client.isSameRepresentation("SimpleJson", "SimpleJson")).toBeTruthy();
            expect(client.isSameRepresentation("BadgerFish", "SimpleJson")).toBeFalsy();
            expect(client.isSameRepresentation("SimpleJson", "BadgerFish")).toBeFalsy();
            expect(client.isSameRepresentation("xml", "BadgerFish")).toBeFalsy();
            expect(client.isSameRepresentation("SimpleJson", "xml")).toBeFalsy();
            expect(() => { client.isSameRepresentation("Xml", "Xml") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("xml", "Xml") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("Xml", "xml") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("", "xml") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("xml", "") }).toThrow("cannot compare");
            expect(() => { client.isSameRepresentation("xml", null) }).toThrow("cannot compare");
        })
    });

    describe("Call which returns a single DOM document", () => {

        it("Should work with SimpleJson representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            client._soapTransport.mockReturnValueOnce(Mock.GET_GETSCHEMA_HELLO_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_HELLO_RESPONSE);
            var doc = await client.NLWS.xtkHello.world();
            expect(doc).toEqual({ world: "cruel" });
        });

        it("Should fail with Xml representation", async () => {
            const client = await Mock.makeClient();
            client._soapTransport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();

            // Make a successful call with "SimpleJson" first to make sure the schema
            // and method are cached. If not, getting the schema will fail when we
            // pass an incorrect representation and hence, we'll not reach the code
            // that should fail decodeing the DOM document returned by the "World" function
            client._soapTransport.mockReturnValueOnce(Mock.GET_GETSCHEMA_HELLO_RESPONSE);
            client._soapTransport.mockReturnValueOnce(Mock.GET_HELLO_RESPONSE);
            var doc = await client.NLWS.xtkHello.world();
            expect(doc).toEqual({ world: "cruel" });

            expect(async () => {
                client._representation = "Dummy";
                client._soapTransport.mockReturnValueOnce(Mock.GET_HELLO_RESPONSE);
                var doc = await client.NLWS.xtkHello.world();
                expect(doc).toEqual({ world: "cruel" });
            }).rejects.toThrow("Dummy");
        });
    });
});
