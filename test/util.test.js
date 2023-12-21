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
 * Unit tests for utilities
 * 
 *********************************************************************************/

const { Util, ArrayMap } = require('../src/util.js');
const { SafeStorage, Cache } = require('../src/cache.js');


describe('Util', function() {

    it("Should test if object is an array", () => {
        expect(Util.isArray(null)).toBe(false);
        expect(Util.isArray(undefined)).toBe(false);
        expect(Util.isArray(0)).toBe(false);
        expect(Util.isArray("nope")).toBe(false);
        expect(Util.isArray({})).toBe(false);
        expect(Util.isArray({ length: 1 })).toBe(false);
        expect(Util.isArray({ length: 1, push: null })).toBe(false);
        expect(Util.isArray({ length: 1, push: "string" })).toBe(false);

        expect(Util.isArray([])).toBe(true);
        expect(Util.isArray([ 1 ])).toBe(true);
    });

    describe("util.schemaIdFromNamespace", () => {
        it("Should should extract schema id for simple namespaces", () => {
            expect(Util.schemaIdFromNamespace("")).toBe("");
            expect(Util.schemaIdFromNamespace("nmsRecipient")).toBe("nms:recipient");
            expect(Util.schemaIdFromNamespace("000Recipient")).toBe("000:recipient");
            expect(Util.schemaIdFromNamespace("Recipient")).toBe(":recipient");
        });
    });

    describe("Util.trim", () => {
        it("Should remove trailing spaces", () => {
            expect(Util.trim("Hello   \n \r \t ")).toBe("Hello");
        })
        it("Should handle null", () => {
            expect(Util.trim(null)).toBe(undefined);    // null => undefined so that we remove undefined properties
        })

        it("Should handle undefined", () => {
            expect(Util.trim(undefined)).toBe(undefined);
        })

        it("Should handle numbers", () => {
            expect(Util.trim(2)).toBe(2);
        })

        it("Should handle arrays", () => {
            expect(Util.trim([2, "Hello", true])).toStrictEqual([2, "Hello", true]);
        })

        it("Should handle null attribute", () => {
            expect(Util.trim({hello:"World", world:null})).toStrictEqual({hello:"World", world:undefined});
        })

        it("Should remove session token cookies", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken</Cookie>Trail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=***</Cookie>Trail"});
        })

        it("Should remove multiple session token cookies", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken</Cookie><Cookie>__sessiontoken=mytoken</Cookie>Trail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=***</Cookie><Cookie>__sessiontoken=***</Cookie>Trail"});
        })

        it("Should handle unfinished session token cookie", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken<Cookie>__sessiontoken=mytokenTrail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=mytoken<Cookie>__sessiontoken=mytokenTrail"});
        })

        it("Should remove security tokens", () => {
            expect(Util.trim({hello:"Lead<X-Security-Token>Stuff</X-Security-Token>Trail"})).toStrictEqual({hello:"Lead<X-Security-Token>***</X-Security-Token>Trail"});
        })

        it("Should remove session token headers", () => {
            expect(Util.trim({hello:"Lead<X-Session-Token>Stuff</X-Session-Token>Trail"})).toStrictEqual({hello:"Lead<X-Session-Token>***</X-Session-Token>Trail"});
        })

        it("Should remove session tokens", () => {
            expect(Util.trim({hello:'Lead<sessiontoken xsi:type="xsd:string">Stuff</sessiontoken>Trail'})).toStrictEqual({hello:'Lead<sessiontoken xsi:type="xsd:string">***</sessiontoken>Trail'});
        })

        it("Should remove password", () => {
            expect(Util.trim({hello:`<sessiontoken xsi:type="xsd:string"/><login xsi:type="xsd:string">admin</login><password xsi:type="xsd:string">password</password><parameters xsi:type="ns:Element" SOAP-ENV:encodingStyle="http://xml.apache.org/xml-soap/literalxml"/>`})).toStrictEqual({hello:`<sessiontoken xsi:type="xsd:string"/><login xsi:type="xsd:string">admin</login><password xsi:type="xsd:string">***</password><parameters xsi:type="ns:Element" SOAP-ENV:encodingStyle="http://xml.apache.org/xml-soap/literalxml"/>`});
        })

        it("Should hide X-Security-Token properties", () => {
            expect(Util.trim({"x-security-token": "Hello"})).toMatchObject({"x-security-token": "***"});
            expect(Util.trim({"X-Security-Token": "Hello"})).toMatchObject({"X-Security-Token": "***"});
        })

        it("Should remove session tokens from cookies", () => {
            expect(Util.trim({"Cookie": "__sessiontoken=ABC"})).toMatchObject({"Cookie": "__sessiontoken=***"});
            expect(Util.trim({"Cookie": "__sessionToken=ABC"})).toMatchObject({"Cookie": "__sessionToken=***"});
            expect(Util.trim({"Cookie": "__sessiontoken=ABC;"})).toMatchObject({"Cookie": "__sessiontoken=***;"});
            expect(Util.trim({"Cookie": "__sessiontoken =ABC"})).toMatchObject({"Cookie": "__sessiontoken =***"});
            expect(Util.trim({"Cookie": "__sessiontoken ABC"})).toMatchObject({"Cookie": "__sessiontoken ABC"});  // no = sign => no token value
            expect(Util.trim({"Cookie": "a=b; __sessiontoken =ABC"})).toMatchObject({"Cookie": "a=b; __sessiontoken =***"});  
            expect(Util.trim({"Cookie": "a=b; __sessiontoken =ABC; c=d"})).toMatchObject({"Cookie": "a=b; __sessiontoken =***; c=d"});
            expect(Util.trim({"Cookie": "a=b; __token =ABC; c=d"})).toMatchObject({"Cookie": "a=b; __token =ABC; c=d"});
        })
    })

    describe("Safe storage", () => {
      it("Should support undefined delegate", async () => {
          const storage = new SafeStorage();
          await expect(storage.getItem("Hello")).resolves.toBeUndefined();
          storage.setItem("Hello", { text: "World" });
          await expect(storage.getItem("Hello")).resolves.toBeUndefined();
          storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
          await expect(storage.getItem("Hello")).resolves.toBeUndefined();
          storage.removeItem("Hello");
          await expect(storage.getItem("Hello")).resolves.toBeUndefined();
      })  

      it("Should handle map", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate);
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
        await storage.setItem("Hello", { text: "World" });
        expect(map["Hello"]).toStrictEqual(JSON.stringify({text: "World"}));
        await expect(storage.getItem("Hello")).resolves.toStrictEqual({"text": "World"});
        await storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
        await storage.setItem("Hello", { text: "World" });
        await storage.removeItem("Hello");
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
      })

      it("Should handle root key", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate, "root");
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
        await storage.setItem("Hello", { text: "World" });
        expect(map["root$Hello"]).toStrictEqual(JSON.stringify({text: "World"}));
        await expect(storage.getItem("Hello")).resolves.toStrictEqual({"text": "World"});
        await storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
        expect(map["root$Hello"]).toBeUndefined();
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
        await storage.setItem("Hello", { text: "World" });
        await storage.removeItem("Hello");
        expect(map["root$Hello"]).toBeUndefined();
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
      })

      it("Edge cases", () => {
        expect(new SafeStorage()._storage).toBeUndefined();
        expect(new SafeStorage()._rootKey).toBe("");
        expect(new SafeStorage(null)._storage).toBeUndefined();
        expect(new SafeStorage(null)._rootKey).toBe("");
        expect(new SafeStorage(null, "")._storage).toBeUndefined();
        expect(new SafeStorage(null, "")._rootKey).toBe("");
      })

      it("Should remove invalid items on get", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate, "root");
        // value is not valid because not a JSON serialized string
        map["root$Hello"] = "Invalid";
        await expect(storage.getItem("Hello")).resolves.toBeUndefined();
        // Get should have removed invalid value
        expect(map["root$Hello"]).toBeUndefined()
      })

      it("Should handle cache last cleared", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        await cache.put("Hello", "World");
        expect(JSON.parse(map["root$Hello"])).toMatchObject({ value:"World" });
        await expect(cache.get("Hello")).resolves.toBe("World");
        await cache.clear();
        // Clear could not remove the item from the map
        expect(JSON.parse(map["root$Hello"])).toMatchObject({ value:"World" });
        // But get from cache will
        await expect(cache.get("Hello")).resolves.toBeUndefined();
      })
    })

    it("Should preserve last cleared", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        expect(cache._lastCleared).toBeNull(); // means we do not have the last cleared value yet
        await cache.get("dummy"); // trigger getItem to lastCleared, and then dummy
        await cache.put("Hello", "World");
        await cache.clear();
        const lastCleared = cache._lastCleared;
        expect(lastCleared).not.toBeUndefined();
        await expect(cache.get("Hello")).resolves.toBeUndefined();
        expect(map["root$lastCleared"]).toBe(JSON.stringify({timestamp:lastCleared}));
        // New cache with same delegate storage should preserve lastCleared date
        const cache2 = new Cache(delegate, "root");
        expect(cache2._lastCleared).toBeNull(); // means we do not have the last cleared value yet
        await cache2.get("dummy"); // trigger getItem to lastCleared, and then dummy
        expect(cache2._lastCleared).toBe(lastCleared);
    })

    it("Should cache in memory value which is in local storage", async () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        map["root$Hello"] = JSON.stringify({ value: "World", cachedAt:Date.now() + 99999999 });
        const value = await cache.get("Hello");
        expect(value).toBe("World");
        expect(cache._cache["Hello"].value).toBe("World");
    })

    describe("ArrayMap", () => {

        it("Should support access by keys", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            expect(am["hello"]).toBe("Hello");
            expect(am["world"]).toBe("World");
            expect(am.get("hello")).toBe("Hello");
            expect(am.get("world")).toBe("World");
        });

        it("Should support access by index", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            expect(am[0]).toBe("Hello");
            expect(am[1]).toBe("World");
            expect(am.get(0)).toBe("Hello");
            expect(am.get(1)).toBe("World");
        });

        it("Should support length attribute", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            expect(am.length).toBe(2);
        });

        it("Should support iterators (for...of)", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            let cat = "";
            for (const s of am) cat = cat + s;
            expect(cat).toBe("HelloWorld");
        });

        it("Should support map()", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            const cat = am.map(s => s).join(',');
            expect(cat).toBe("Hello,World");
        });

        it("Should support flatMap()", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", ["Adobe", "World"]);
            const cat = am.flatMap(s => s).join(',');
            expect(cat).toBe("Hello,Adobe,World");
        });

        it("Should support find()", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            const world = am.find(s => s === 'World');
            expect(world).toBe("World");
            const notFound = am.find(s => s === 'NotFound');
            expect(notFound).toBe(undefined);
        });

        it("Should support filter()", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            const all = am.filter(s => true);
            expect(all).toMatchObject([ "Hello", "World" ]);
            const none = am.filter(s => false);
            expect(none).toMatchObject([ ]);
            const world = am.filter(s => s === 'World');
            expect(world).toMatchObject([ "World" ]);
        });

        it("Should support forEach", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            let cat = "";
            am.forEach(s => cat = cat + s);
            expect(cat).toBe("HelloWorld");
        });

        it("Should support forEach as a key", () => {
            const am = new ArrayMap();
            am._push("forEach", "Hello");
            const cat = am.map(s => s).join(',');
            expect(cat).toBe("Hello");
            expect(typeof am.forEach).toBe('function');
            expect(am["forEach"]).not.toBe("Hello"); // forEach is a function
            expect(am.get("forEach")).toBe("Hello");
        });

        it("Should support for...in", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("world", "World");
            let cat = "";
            for (const s in am) cat = cat + s;
            expect(cat).toBe("helloworld");
        });

        it("Should not support for...in when there's a property named 'forEach'", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("forEach", "World");
            let cat = "";
            for (const s in am) cat = cat + s;
            expect(cat).toBe("hello");
        });

        it("Should support enumerations whose key is a number", () => {
            // For instance the "addressQuality" enumeration
            const am = new ArrayMap();
            am._push("0", { name:"0", value:0 });
            am._push("1", { name:"1", value:1 });
            am._push("2", { name:"2", value:2 });
            let cat = "";
            for (const k in am) cat = cat + am.get(k).name;
            expect(cat).toBe("012");
        });

        it("Should support adding the same key twice. The last value overwrites", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            expect(am.length).toBe(1);
            am._push("hello", "World");
            expect(am.length).toBe(1);
            expect(am.get(0)).toBe("World");
        });

        it("Should support adding the same key twice. The last value overwrites in the middle of the array", () => {
            const am = new ArrayMap();
            am._push("hello", "Hello");
            am._push("cruel", "Cruel");
            am._push("world", "World");
            expect(am.length).toBe(3);
            am._push("cruel", "*cruel*");
            expect(am.length).toBe(3);
            expect(am.get(0)).toBe("Hello");
            expect(am.get(1)).toBe("*cruel*");
            expect(am.get(2)).toBe("World");
        });

        it("Should support missing names", () => {
            const am = new ArrayMap();
            am._push("", { name:"0", value:0 });
            am._push(undefined, { name:"1", value:1 });
            am._push(null, { name:"2", value:2 });
            expect(am.length).toBe(3);
            expect(am[0].name).toBe("0");
            expect(am[1].name).toBe("1");
            expect(am[2].name).toBe("2");
        });

        it("Should handle compatibility", () => {
            const am = new ArrayMap();
            am._push("perfect", { name:"perfect", value:0 });
            am._push("notPerfect", { name:"notPerfect", value:1 });
            am._push("error", { name:"error", value:2 });
            // length
            expect(am.length).toBe(3);
            // Access by name
            expect(am.perfect).toMatchObject({ name:"perfect", value:0 });
            expect(am.notPerfect).toMatchObject({ name:"notPerfect", value:1 });
            expect(am.error).toMatchObject({ name:"error", value:2 });
            expect(am.notFound).toBeUndefined();
            // for .. in loop
            const list = [];
            for (const p in am) list.push(p);
            expect(list).toMatchObject([ "perfect", "notPerfect", "error" ]);
        });
    });

    describe("Is Browser", () => {
        it("Should not be a browser", () => {
            expect(Util.isBrowser()).toBe(false);
        });
    });

    describe("Promises", () => {
        it("Should tell if an object is a promise", () => {
            expect(Util.isPromise()).toBe(false);
            expect(Util.isPromise(null)).toBe(false);
            expect(Util.isPromise({})).toBe(false);
            expect(Util.isPromise([])).toBe(false);
            expect(Util.isPromise({ then: 3 })).toBe(false);
            expect(Util.isPromise(new Promise((resolve, reject) => {}))).toBe(true);
            expect(Util.isPromise(Promise.resolve(3))).toBe(true);
        });

        it("Should ensure a promise", async () => {
            await expect(Util.asPromise(null)).resolves.toBe(null);
            await expect(Util.asPromise(3)).resolves.toBe(3);
            await expect(Util.asPromise(Promise.resolve(3))).resolves.toBe(3);
        });
    });
});

