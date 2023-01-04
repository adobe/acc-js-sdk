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
 * Unit tests for the method cache
 * 
 *********************************************************************************/

const assert = require('assert');
const { Cache, SafeStorage } = require('../src/cache.js');
const OptionCache = require('../src/optionCache.js').OptionCache;
const MethodCache = require('../src/methodCache.js').MethodCache;
const XtkEntityCache = require('../src/xtkEntityCache.js').XtkEntityCache;
const { DomUtil } = require('../src/domUtil.js');

describe('Caches', function() {

    describe("Generic cache", () => {
        it("Should cache with default TTL and default key function", async () => {
            const cache = new Cache();
            await cache.put("Hello", "World");
            expect(cache._stats).toMatchObject({ reads: 0, writes: 1 });
            await expect(cache.get("Hello")).resolves.toBe("World");
            expect(cache._stats).toMatchObject({ reads: 1, writes: 1, memoryHits: 1, storageHits: 0 });
        })

        it("Should expires after TTL", async () => {
            const cache = new Cache(undefined, undefined, -1);    // negative TTL => will immediately expire
            await cache.put("Hello", "World");
            await expect(cache.get("Hello")).resolves.toBeUndefined();
            expect(cache._stats).toMatchObject({ reads: 1, writes: 1, memoryHits: 0, storageHits: 0 });
        })

        it("Should support custom key function", async () => {
            const cache = new Cache(undefined, undefined, 300000, ((a, b) => a + "||" + b));
            await cache.put("key-part-1", "key-part-2", "value");
            await expect(cache.get("key-part-1")).resolves.toBeUndefined();
            await expect(cache.get("key-part-2")).resolves.toBeUndefined();
            await expect(cache.get("key-part-1", "key-part-2")).resolves.toBe("value");
        })

        it("Should clear cache", async () => {
            const cache = new Cache();
            await cache.put("Hello", "World");
            await expect(cache.get("Hello")).resolves.toBe("World");
            await cache.clear();
            await expect(cache.get("Hello")).resolves.toBeUndefined();
            expect(cache._stats).toMatchObject({ reads: 2, writes: 1, memoryHits: 1, storageHits: 0, clears: 1 });
        })

        it("Should remove key in cache", async () => {
            const cache = new Cache();
            await cache.put("Hello", "World");
            await cache.put("Hi", "A");
            await expect(cache.get("Hello")).resolves.toBe("World");
            await expect(cache.get("Hi")).resolves.toBe("A");
            expect(cache._stats).toMatchObject({ reads: 2, writes: 2, memoryHits: 2 });
            await cache.remove("Hello");
            await expect(cache.get("Hello")).resolves.toBeUndefined();
            await expect(cache.get("Hi")).resolves.toBe("A");
            expect(cache._stats).toMatchObject({ reads: 4, writes: 2, memoryHits: 3, removals: 1 });
            // should support removing a key which has already been removed
            await cache.remove("Hello");
            await expect(cache.get("Hello")).resolves.toBeUndefined();
            await expect(cache.get("Hi")).resolves.toBe("A");
        })
    });

    describe("Entity cache", function() {
        it("Should cache value", async () => {
            const cache = new XtkEntityCache();
            await expect(cache.get("xtk:srcSchema", "nms:recipient")).resolves.toBeUndefined();
            await cache.put("xtk:srcSchema", "nms:recipient", "$$entity$$");
            await expect(cache.get("xtk:srcSchema", "nms:recipient")).resolves.toBe("$$entity$$");
        });

        it("Should cache interfaces", async () => {
            const cache = new XtkEntityCache();
            const schema = DomUtil.parse(`<schema namespace="xtk" name="session" implements="xtk:persist">
                    <interface name="persist"/>
                    <element name="session"/>
                </schema>`);
            await cache.put("xtk:schema", "xtk:session", schema.documentElement);
            const session = await cache.get("xtk:schema", "xtk:session");
            expect(session).not.toBeNull();
            expect(session.getAttribute("name")).toBe("session");
            const persist = await cache.get("xtk:schema", "xtk:persist");
            expect(persist).not.toBeNull();
            expect(persist.getAttribute("name")).toBe("persist");
        });

    });

    describe("Option cache", function() {

        it("Should cache value", async () => {
            const cache = new OptionCache();
            await expect(cache.get("hello")).resolves.toBeUndefined();
            await cache.put("hello", ["world", 6]);
            await expect(cache.get("hello")).resolves.toBe("world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "world", "type": 6, "value": "world"});
        });

        it("Should cache multiple value", async () => {
            const cache = new OptionCache();
            await cache.put("hello", ["world", 6]);
            await cache.put("foo", ["bar", 6]);
            await expect(cache.get("hello")).resolves.toBe("world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "world", "type": 6, "value": "world"});
            await expect(cache.get("foo")).resolves.toBe("bar");
            await expect(cache.getOption("foo")).resolves.toEqual({"rawValue": "bar", "type": 6, "value": "bar"});
        });

        it("Should overwrite cached value", async () => {
            const cache = new OptionCache();
            await cache.put("hello", ["world", 6]);
            await expect(cache.get("hello")).resolves.toBe( "world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "world", "type": 6, "value": "world"});
            await cache.put("hello", ["cruel world", 6]);
            await expect(cache.get("hello")).resolves.toBe("cruel world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "cruel world", "type": 6, "value": "cruel world"});
        });

        it("Should clear cache", async () => {
            const cache = new OptionCache();
            await cache.put("hello", ["world", 6]);
            await expect(cache.get("hello")).resolves.toBe("world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "world", "type": 6, "value": "world"});
            await cache.clear();
            await expect(cache.get("hello")).resolves.toBeUndefined();
            await expect(cache.getOption("hello")).resolves.toBeUndefined();
        });

        it("Should not find", async () => {
            const cache = new OptionCache();
            await expect(cache.get("hello")).resolves.toBeUndefined();
            await expect(cache.getOption("hello")).resolves.toBeUndefined();
        });

        it("Deprecated cache methods should now replaced with put", async () => {
            const cache = new OptionCache();
            await cache.cache("hello", ["world", 6]);
            await expect(cache.get("hello")).resolves.toBe("world");
            await expect(cache.getOption("hello")).resolves.toEqual({"rawValue": "world", "type": 6, "value": "world"});
        });
    });

    describe("Method cache", function() {
        it("Should cache methods", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            await cache.put(schema.documentElement);

            var found = await cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Delete");

            found = await cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Create");
        });

        it("Should cache interface methods", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient' implements='nms:i'><interface name='i'><method name='Update'/></interface><element name='recipient'/><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            await cache.put(schema.documentElement);
            // interface method should be on schema
            var found = await cache.get("nms:recipient", "Update");
            assert.ok(found !== null && found !== undefined);
            // and on interface as well
            found = await cache.get("nms:i", "Update");
            assert.ok(found !== null && found !== undefined);
        });

        it("Should clear the cache", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            await cache.put(schema.documentElement);

            var found = await cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);

            await cache.clear();
            found = await cache.get("nms:recipient", "Delete");
            assert.ok(found === undefined);
        });

        it("Should ignore non-method nodes", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><dummy name='Update'/><method name='Create'/></methods></schema>");
            await cache.put(schema.documentElement);

            var found = await cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            found = await cache.get("nms:recipient", "Update");
            assert.ok(found === undefined);
            found = await cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
        });

        it("Deprecated cache methods should now replaced with put", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            await cache.cache(schema.documentElement);

            var found = await cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Delete");

            found = await cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Create");
        })
   
        it("Deserialized method should be a DOM element", () => {
            const cache = new MethodCache();
            const serDeser = cache._storage._serDeser;
            const cached = {value: { x:3, method:DomUtil.parse("<hello/>")} };
            const serialized = serDeser(cached, true); 
            const deserialized = serDeser(serialized, false);
            const method = deserialized.value.method;
            // should be a DOM element, not a DOM document
            expect(method.nodeType).toBe(1);
        })
    });

    describe("Method cache for interfaces", function() {
        it("Should cache methods", async () => {
            const cache = new MethodCache();
            // Test for fix in verion 0.1.23. The xtk:session schema has a direct method "Logon" but also implements the
            // xtk:persist interface.
            var schema = DomUtil.parse("<schema namespace='xtk' name='session' implements='xtk:persist'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            await cache.put(schema.documentElement);

            // Logon method should be found in xtk:session and have the xtk:session URN (for SOAP action)
            var found = await cache.get("xtk:session", "Logon");
            var urn = await cache.getSoapUrn("xtk:session", "Logon");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Logon");
            assert.strictEqual(urn, "xtk:session");

            // Logon method should not exist on the xtk:persist interface
            found = await cache.get("xtk:persist", "Logon");
            urn = await cache.getSoapUrn("xtk:persist", "Logon");
            assert.ok(found === undefined);
            assert.ok(urn === undefined);

            // The Write method should also be on xtk:session but use xtk:persist as a URN
            found = await cache.get("xtk:session", "Write");
            urn = await cache.getSoapUrn("xtk:session", "Write");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Write");
            assert.strictEqual(urn, "xtk:persist|xtk:session");

            // For compatibility reasons (SDK versions earlier than 0.1.23), keep the Write method on the interface too
            found = await cache.get("xtk:persist", "Write");
            urn = await cache.getSoapUrn("xtk:persist", "Write");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Write");
            assert.strictEqual(urn, "xtk:persist");
        });

        it("Edge cases for getSoapUrn", async () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='xtk' name='session' implements='xtk:persist'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            await cache.put(schema.documentElement);

            // Schema and method exist
            var urn = await cache.getSoapUrn("xtk:session", "Logon");
            expect(urn).toBe("xtk:session");

            // Schema exists but method doesn't
            urn = await cache.getSoapUrn("xtk:session", "Dummy");
            expect(urn).toBeUndefined();

            // Neither schema nor method exist
            urn = await cache.getSoapUrn("xtk:dummy", "Dummy");
            expect(urn).toBeUndefined();
        });

        it("Schema has interfaces that do not match what schema implements", async () => {
            const cache = new MethodCache();
            // Schema has xtk:persist interface but does not implement it
            var schema = DomUtil.parse("<schema namespace='xtk' name='session'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            await cache.put(schema.documentElement);

            // Logon method should be found in xtk:session and have the xtk:session URN (for SOAP action)
            var found = await cache.get("xtk:session", "Logon");
            var urn = await cache.getSoapUrn("xtk:session", "Logon");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Logon");
            assert.strictEqual(urn, "xtk:session");
        });
    });

    describe("SafeStorage", () => {

        describe("JSON safe storage", () => {

            it("Should find mock json from the cache", async () => {
                const map = {};
                const delegate = {
                    getItem: jest.fn((key) => map[key]),
                    setItem: jest.fn((key, value) => map[key] = value)
                }
                const storage = new SafeStorage(delegate, "");
                await expect(storage.getItem("not_found")).resolves.toBeUndefined();
                map["k1"] = `{ "hello": "world" }`;
                await expect(storage.getItem("k1")).resolves.toMatchObject({ hello: "world" });
                map["k2"] = `{ "value": { "hello": "world" } }`;
                await expect(storage.getItem("k2")).resolves.toMatchObject({ value: { hello: "world" } });
            });
        });

        describe("XML safe storage", () => {

            const xmlSerDeser = (item, serDeser) => {
                if (serDeser) {
                    const xml = DomUtil.toXMLString(item.value);
                    const value = {...item, value: xml };
                    return JSON.stringify(value);
                }
                else {
                    const json = JSON.parse(item);
                    const dom = DomUtil.parse(json.value);
                    return {...json, value:dom.documentElement};
                }
            };

            it("Should find mock xml from the cache", async () => {
                const map = {};
                const delegate = {
                    getItem: jest.fn((key) => map[key]),
                    setItem: jest.fn((key, value) => map[key] = value)
                }
                const storage = new SafeStorage(delegate, "", xmlSerDeser);
                await expect(storage.getItem("not_found")).resolves.toBeUndefined();
                map["k1"] = `{ "hello": "world" }`;
                await expect(storage.getItem("k1")).resolves.toBeUndefined();      // k1 cached object does not have "value" attribute containing serialized XML
                map["k1"] = `{ "hello": "world", "value": "" }`;
                await expect(storage.getItem("k1")).resolves.toBeUndefined();      // k1 cached object does not have "value" attribute containing serialized XML
                map["k1"] = `{ "value": { "hello": "world" } }`;
                await expect(storage.getItem("k2")).resolves.toBeUndefined();      // k1 cached object does not have "value" attribute but it's not valid XML
                map["k1"] = `{ "value": "" } }`;
                await expect(storage.getItem("k1")).resolves.toBeUndefined();      // k1 cached object does not have "value" attribute but it's not valid XML
                map["k1"] = `{ "value": "bad" } }`;
                await expect(storage.getItem("k1")).resolves.toBeUndefined();      // k1 cached object does not have "value" attribute but it's not valid XML
                map["k2"] = `{ "value": "<hello/>" }`;
                await expect(storage.getItem("k2")).resolves.toMatchObject({ value: {tagName: "hello"}});
            });
        });
    });

    describe("Cache seralizers", () => {
        it("Should serialize json", async () => {
            const cache = new OptionCache();
            const serDeser = cache._storage._serDeser;
            expect(serDeser({ hello: "World" }, true)).toBe('{"hello":"World"}');
            expect(serDeser({ }, true)).toBe('{}');
            expect(() => {serDeser(null, true)}).toThrow("Cannot serialize");
            expect(() => {serDeser(undefined, true)}).toThrow("Cannot serialize");
            expect(() => {serDeser("", true)}).toThrow("Cannot serialize");
            expect(() => {serDeser("Hello", true)}).toThrow("Cannot serialize");
        })

        it("Should deserialize json", () => {
            const cache = new OptionCache();
            const serDeser = cache._storage._serDeser;
            expect(serDeser('{"hello":"World"}', false)).toMatchObject({ hello: "World" });
            expect(serDeser('{}', false)).toMatchObject({ });
            expect(() => {serDeser(null, false)}).toThrow("Cannot deserialize");
            expect(() => {serDeser(undefined, false)}).toThrow("Cannot deserialize");
            expect(() => {serDeser("", false)}).toThrow("Cannot deserialize");
            expect(() => {serDeser("Hello", false)}).toThrow("Unexpected token");
        })

        it("Should serialize XML entity", () => {
            const cache = new XtkEntityCache();
            const serDeser = cache._storage._serDeser;
            expect(serDeser({value: DomUtil.parse("<hello/>")}, true)).toBe('{"value":"<hello/>"}')
            expect(() => { serDeser({}, true); }).toThrow();
            expect(() => { serDeser(null, true); }).toThrow();
            expect(() => { serDeser(undefined, true); }).toThrow();
            expect(() => { serDeser("", true); }).toThrow();
            expect(() => { serDeser("Hello", true); }).toThrow();
        })

        it("Should deserialize XML entity", () => {
            const cache = new XtkEntityCache();
            const serDeser = cache._storage._serDeser;
            expect(DomUtil.toXMLString(serDeser(`{"value":"<hello/>"}`, false).value)).toBe("<hello/>");
            expect(() => {serDeser(null, false)}).toThrow();
            expect(() => {serDeser(undefined, false)}).toThrow();
            expect(() => {serDeser("", false)}).toThrow();
            expect(() => {serDeser("Hello", false)}).toThrow();
        })

        it("Should serialize methods", () => {
            const cache = new MethodCache();
            const serDeser = cache._storage._serDeser;
            expect(serDeser({value: { x:3, method:DomUtil.parse("<hello/>")} }, true)).toBe('{"value":{"x":3,"method":"<hello/>"}}')
            expect(() => { serDeser({value: { x:3 }}, true); }).toThrow();
            expect(() => { serDeser({}, true); }).toThrow();
            expect(() => { serDeser(null, true); }).toThrow();
            expect(() => { serDeser(undefined, true); }).toThrow();
            expect(() => { serDeser("", true); }).toThrow();
            expect(() => { serDeser("Hello", true); }).toThrow();
        })

        it("Should deserialize methods", () => {
            const cache = new MethodCache();
            const serDeser = cache._storage._serDeser;
            expect(DomUtil.toXMLString(serDeser('{"value":{"x":3,"method":"<hello/>"}}', false).value.method)).toBe("<hello/>");
            expect(() => { serDeser('{"value":{"x":3}}', false); }).toThrow();
            expect(() => { serDeser({}, false); }).toThrow();
            expect(() => { serDeser(null, false); }).toThrow();
            expect(() => { serDeser(undefined, false); }).toThrow();
            expect(() => { serDeser("", false); }).toThrow();
            expect(() => { serDeser("Hello", false); }).toThrow();
        })

        it("Method serialization should not change initial object", () => {
            const cache = new MethodCache();
            const serDeser = cache._storage._serDeser;
            const cached = {value: { x:3, method:DomUtil.parse("<hello/>")} };
            serDeser(cached, true); // make sure this call does not change the input parameter "cached"
            expect(cached.value.x).toBe(3);
            expect(cached.value.method.documentElement.tagName).toBe("hello");
        })
    });
    
    describe("Sync and Async delegates", () => {
        it("Should support synchronous delegates", async () => {
            const map = {};
            const delegate = {
                getItem: jest.fn((key) => map[key]),
                setItem: jest.fn((key, value) => map[key] = value)
            }
            const storage = new SafeStorage(delegate, "");
            await storage.setItem("Hello", { cruel: "World" });
            await expect(storage.getItem("Hello")).resolves.toMatchObject({ cruel: "World" });
        });
        it("Should support asynchronous delegates", async () => {
            const map = {};
            const delegate = {
                getItem: jest.fn(async (key) => Promise.resolve(map[key]) ),
                setItem: jest.fn(async (key, value) => {
                    return new Promise((resolve, reject) => {
                        map[key] = value;
                        resolve(value);
                    });
                })
            }
            const storage = new SafeStorage(delegate, "");
            await storage.setItem("Hello", { cruel: "World" });
            await expect(storage.getItem("Hello")).resolves.toMatchObject({ cruel: "World" });
        });
    });
});
