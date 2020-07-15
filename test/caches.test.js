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
const { isRegExp } = require('util');
const OptionCache = require('../src/optionCache.js').OptionCache;
const MethodCache = require('../src/methodCache.js').MethodCache;
const XtkEntityCache = require('../src/xtkEntityCache.js').XtkEntityCache;
const { DomUtil } = require('../src/dom.js');

describe('Caches', function() {

    describe("Entity cache", function() {
        it("Should cache value", function() {
            const cache = new XtkEntityCache();
            assert.equal(cache.get("xtk:srcSchema", "nms:recipient"), undefined);
            cache.put("xtk:srcSchema", "nms:recipient", "$$entity$$");
            assert.equal(cache.get("xtk:srcSchema", "nms:recipient"), "$$entity$$");
        });

        it("Should cache interfaces", function() {
            const cache = new XtkEntityCache();
            const schema = DomUtil.parse(`<schema namespace="xtk" name="session">
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
            assert.equal(cache.get("hello"), undefined);
            cache.cache("hello", "world");
            assert.equal(cache.get("hello"), "world");
        });

        it("Should cache multiple value", function() {
            const cache = new OptionCache();
            cache.cache("hello", "world");
            cache.cache("foo", "bar");
            assert.equal(cache.get("hello"), "world");
            assert.equal(cache.get("foo"), "bar");
        });

        it("Should overwrite cached value", function() {
            const cache = new OptionCache();
            cache.cache("hello", "world");
            assert.equal(cache.get("hello"), "world");
            cache.cache("hello", "cruel world");
            assert.equal(cache.get("hello"), "cruel world");
        });

        it("Should clear cache", function() {
            const cache = new OptionCache();
            cache.cache("hello", "world");
            assert.equal(cache.get("hello"), "world");
            cache.clear();
            assert.equal(cache.get("hello"), undefined);
        });

        if("Should not find", function() {
            const cache = new OptionCache();
            assert.equal(cache.get("hello"), undefined);
        });

    });

    describe("Method cache", function() {
        it("Should cache methods", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.cache(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Delete");

            var found = cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
            assert.equal(found.nodeName, "method");
            assert.equal(found.getAttribute("name"), "Create");
        });

        it("Should cache interface methods", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><interface name='i'><method name='Update'/></interface><element name='recipient'/><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.cache(schema.documentElement);
            // interface method should not be on schema
            var found = cache.get("nms:recipient", "Update");
            assert.ok(found === undefined);
            // but on interface
            var found = cache.get("nms:i", "Update");
            assert.ok(found !== null && found !== undefined);
        });

        it("Should cler the cache", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><method name='Create'/></methods></schema>");
            cache.cache(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);

            cache.clear();
            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found === undefined);
        });

        if("Should ignore non-method nodes", function() {
            const cache = new MethodCache();
            var schema = DomUtil.parse("<schema namespace='nms' name='recipient'><methods><method name='Delete'/><dummy name='Update'/><method name='Create'/></methods></schema>");
            cache.cache(schema.documentElement);

            var found = cache.get("nms:recipient", "Delete");
            assert.ok(found !== null && found !== undefined);
            var found = cache.get("nms:recipient", "Update");
            assert.ok(found === undefined);
            var found = cache.get("nms:recipient", "Create");
            assert.ok(found !== null && found !== undefined);
        });
    });
});
