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
const { Cache } = require('../src/util.js');
const OptionCache = require('../src/optionCache.js').OptionCache;
const MethodCache = require('../src/methodCache.js').MethodCache;
const XtkEntityCache = require('../src/xtkEntityCache.js').XtkEntityCache;
const { DomUtil } = require('../src/domUtil.js');

describe('Caches', function() {

    describe("Generic cache", () => {
        it("Should cache with default TTL and default key function", () => {
            const cache = new Cache();
            cache.put("Hello", "World");
            expect(cache.get("Hello")).toBe("World");
        })

        it("Should expires after TTL", () => {
            const cache = new Cache(-1);    // negative TTL => will immediately expire
            cache.put("Hello", "World");
            expect(cache.get("Hello")).toBeUndefined();
        })

        it("Should support custom key function", () => {
            const cache = new Cache(300000, ((a, b) => a + "||" + b));
            cache.put("key-part-1", "key-part-2", "value");
            expect(cache.get("key-part-1")).toBeUndefined();
            expect(cache.get("key-part-2")).toBeUndefined();
            expect(cache.get("key-part-1", "key-part-2")).toBe("value");
        })

        it("Should clear cache", () => {
            const cache = new Cache();
            cache.put("Hello", "World");
            expect(cache.get("Hello")).toBe("World");
            cache.clear();
            expect(cache.get("Hello")).toBeUndefined();
        })
    })

    describe("Entity cache", function() {
        it("Should cache value", function() {
            const cache = new XtkEntityCache();
            assert.equal(cache.get("xtk:srcSchema", "nms:recipient"), undefined);
            cache.put("xtk:srcSchema", "nms:recipient", "$$entity$$");
            assert.equal(cache.get("xtk:srcSchema", "nms:recipient"), "$$entity$$");
        });

        it("Should cache interfaces", function() {
            const cache = new XtkEntityCache();
            const schema = DomUtil.parse(`<schema namespace="xtk" name="session" implements="xtk:persist">
                    <interface name="persist"/>
                    <element name="session"/>
                </schema>`);
            cache.put("xtk:schema", "xtk:session", schema.documentElement);
            const session = cache.get("xtk:schema", "xtk:session");
            expect(session).not.toBeNull();
            expect(session.getAttribute("name")).toBe("session");
            const persist = cache.get("xtk:schema", "xtk:persist");
            expect(persist).not.toBeNull();
            expect(persist.getAttribute("name")).toBe("persist");
        });

    });

    describe("Option cache", function() {

        it("Should cache value", function() {
            const cache = new OptionCache();
            expect(cache.get("hello")).toBeUndefined();
            cache.put("hello", ["world", 6]);
            expect(cache.get("hello")).toBe("world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "world", "type": 6, "value": "world"});
        });

        it("Should cache multiple value", function() {
            const cache = new OptionCache();
            cache.put("hello", ["world", 6]);
            cache.put("foo", ["bar", 6]);
            expect(cache.get("hello")).toBe("world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "world", "type": 6, "value": "world"});
            expect(cache.get("foo")).toBe("bar");
            expect(cache.getOption("foo")).toEqual({"rawValue": "bar", "type": 6, "value": "bar"});
        });

        it("Should overwrite cached value", function() {
            const cache = new OptionCache();
            cache.put("hello", ["world", 6]);
            expect(cache.get("hello")).toBe( "world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "world", "type": 6, "value": "world"});
            cache.put("hello", ["cruel world", 6]);
            expect(cache.get("hello")).toBe("cruel world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "cruel world", "type": 6, "value": "cruel world"});
        });

        it("Should clear cache", function() {
            const cache = new OptionCache();
            cache.put("hello", ["world", 6]);
            expect(cache.get("hello")).toBe("world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "world", "type": 6, "value": "world"});
            cache.clear();
            expect(cache.get("hello")).toBeUndefined();
            expect(cache.getOption("hello")).toBeUndefined();
        });

        it("Should not find", function() {
            const cache = new OptionCache();
            expect(cache.get("hello")).toBeUndefined();
            expect(cache.getOption("hello")).toBeUndefined();
        });

        it("Deprecated cache methods should now replaced with put", () => {
            const cache = new OptionCache();
            cache.cache("hello", ["world", 6]);
            expect(cache.get("hello")).toBe("world");
            expect(cache.getOption("hello")).toEqual({"rawValue": "world", "type": 6, "value": "world"});
        });
    });

    describe("Method cache", function() {
        it("Should cache methods", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.put(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Delete");

            found = cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Create");
        });

        it("Should cache interface methods", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient' implements='nms:i'><interface name='i'><method name='Update'/></interface><element name='recipient'/><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.put(schema.documentElement);
            // interface method should be on schema
            var found = cache.get("nms:recipient", "Update");
            assert.ok(found !== null && found !== undefined);
            // and on interface as well
            found = cache.get("nms:i", "Update");
            assert.ok(found !== null && found !== undefined);
        });

        it("Should clear the cache", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.put(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);

            cache.clear();
            found = cache.get("nms:recipient", "Delete");
            assert.ok(found === undefined);
        });

        it("Should ignore non-method nodes", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><dummy name='Update'/><method name='Create'/></methods></schema>");
            cache.put(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            found = cache.get("nms:recipient", "Update");
            assert.ok(found === undefined);
            found = cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
        });

        it("Deprecated cache methods should now replaced with put", () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.cache(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Delete");

            found = cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Create");
        })
    
    });

    describe("Method cache for interfaces", function() {
        it("Should cache methods", function() {
            const cache = new MethodCache();
            // Test for fix in verion 0.1.23. The xtk:session schema has a direct method "Logon" but also implements the
            // xtk:persist interface.
            var schema = DomUtil.parse("<schema namespace='xtk' name='session' implements='xtk:persist'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            cache.put(schema.documentElement);

            // Logon method should be found in xtk:session and have the xtk:session URN (for SOAP action)
            var found = cache.get("xtk:session", "Logon");
            var urn = cache.getSoapUrn("xtk:session", "Logon");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Logon");
            assert.strictEqual(urn, "xtk:session");

            // Logon method should not exist on the xtk:persist interface
            found = cache.get("xtk:persist", "Logon");
            urn = cache.getSoapUrn("xtk:persist", "Logon");
            assert.ok(found === undefined);
            assert.ok(urn === undefined);

            // The Write method should also be on xtk:session but use xtk:persist as a URN
            found = cache.get("xtk:session", "Write");
            urn = cache.getSoapUrn("xtk:session", "Write");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Write");
            assert.strictEqual(urn, "xtk:persist");

            // For compatibility reasons (SDK versions earlier than 0.1.23), keep the Write method on the interface too
            found = cache.get("xtk:persist", "Write");
            urn = cache.getSoapUrn("xtk:persist", "Write");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Write");
            assert.strictEqual(urn, "xtk:persist");
        });

        it("Edge cases for getSoapUrn", () => {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='xtk' name='session' implements='xtk:persist'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            cache.put(schema.documentElement);

            // Schema and method exist
            var urn = cache.getSoapUrn("xtk:session", "Logon");
            expect(urn).toBe("xtk:session");

            // Schema exists but method doesn't
            urn = cache.getSoapUrn("xtk:session", "Dummy");
            expect(urn).toBeUndefined();

            // Neither schema nor method exist
            urn = cache.getSoapUrn("xtk:dummy", "Dummy");
            expect(urn).toBeUndefined();
        });

        it("Schema has interfaces that do not match what schema implements", () => {
            const cache = new MethodCache();
            // Schema has xtk:persist interface but does not implement it
            var schema = DomUtil.parse("<schema namespace='xtk' name='session'><interface name='persist'><method name='Write' static='true'/></interface><methods><method name='Logon'/></methods></schema>");
            cache.put(schema.documentElement);

            // Logon method should be found in xtk:session and have the xtk:session URN (for SOAP action)
            var found = cache.get("xtk:session", "Logon");
            var urn = cache.getSoapUrn("xtk:session", "Logon");
            assert.ok(found !== null && found !== undefined);
            assert.strictEqual(found.nodeName, "method");
            assert.strictEqual(found.getAttribute("name"), "Logon");
            assert.strictEqual(urn, "xtk:session");
        });
    });
});
