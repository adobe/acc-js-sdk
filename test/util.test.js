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

const { Util, SafeStorage, Cache } = require('../src/util.js');


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
      it("Should support undefined delegate", () => {
          const storage = new SafeStorage();
          expect(storage.getItem("Hello")).toBeUndefined();
          storage.setItem("Hello", { text: "World" });
          expect(storage.getItem("Hello")).toBeUndefined();
          storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
          expect(storage.getItem("Hello")).toBeUndefined();
          storage.removeItem("Hello");
          expect(storage.getItem("Hello")).toBeUndefined();
      })  

      it("Should handle map", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate);
        expect(storage.getItem("Hello")).toBeUndefined();
        storage.setItem("Hello", { text: "World" });
        expect(map["Hello"]).toStrictEqual(JSON.stringify({text: "World"}));
        expect(storage.getItem("Hello")).toStrictEqual({"text": "World"});
        storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
        expect(storage.getItem("Hello")).toBeUndefined();
        storage.setItem("Hello", { text: "World" });
        storage.removeItem("Hello");
        expect(storage.getItem("Hello")).toBeUndefined();
      })

      it("Should handle root key", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate, "root");
        expect(storage.getItem("Hello")).toBeUndefined();
        storage.setItem("Hello", { text: "World" });
        expect(map["root$Hello"]).toStrictEqual(JSON.stringify({text: "World"}));
        expect(storage.getItem("Hello")).toStrictEqual({"text": "World"});
        storage.setItem("Hello", "World");    // value should be JSON but errors are ignored
        expect(map["root$Hello"]).toBeUndefined();
        expect(storage.getItem("Hello")).toBeUndefined();
        storage.setItem("Hello", { text: "World" });
        storage.removeItem("Hello");
        expect(map["root$Hello"]).toBeUndefined();
        expect(storage.getItem("Hello")).toBeUndefined();
      })

      it("Edge cases", () => {
        expect(new SafeStorage()._storage).toBeUndefined();
        expect(new SafeStorage()._rootKey).toBe("");
        expect(new SafeStorage(null)._storage).toBeUndefined();
        expect(new SafeStorage(null)._rootKey).toBe("");
        expect(new SafeStorage(null, "")._storage).toBeUndefined();
        expect(new SafeStorage(null, "")._rootKey).toBe("");
      })

      it("Should remove invalid items on get", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const storage = new SafeStorage(delegate, "root");
        // value is not valid because not a JSON serialized string
        map["root$Hello"] = "Invalid";
        expect(storage.getItem("Hello")).toBeUndefined();
        // Get should have removed invalid value
        expect(map["root$Hello"]).toBeUndefined()
      })

      it("Should handle cache last cleared", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        cache.put("Hello", "World");
        expect(JSON.parse(map["root$Hello"])).toMatchObject({ value:"World" });
        expect(cache.get("Hello")).toBe("World");
        cache.clear();
        // Clear could not remove the item from the map
        expect(JSON.parse(map["root$Hello"])).toMatchObject({ value:"World" });
        // But get from cache will
        expect(cache.get("Hello")).toBeUndefined();
      })
    })

    it("Should preserve last cleared", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        expect(cache._lastCleared).toBeUndefined();
        cache.put("Hello", "World");
        cache.clear();
        const lastCleared = cache._lastCleared;
        expect(lastCleared).not.toBeUndefined();
        expect(cache.get("Hello")).toBeUndefined();
        expect(map["root$lastCleared"]).toBe(JSON.stringify({timestamp:lastCleared}));
        // New cache with same delegate storage should preserve lastCleared date
        const cache2 = new Cache(delegate, "root");
        expect(cache2._lastCleared).toBe(lastCleared);
    })

    it("Should cache in memory value which is in local storage", () => {
        const map = {};
        const delegate = {
            getItem: (key) => map[key],
            setItem: (key, value) => { map[key] = value },
            removeItem: (key) => { delete map[key] }
        };
        const cache = new Cache(delegate, "root");
        map["root$Hello"] = JSON.stringify({ value: "World", cachedAt:Date.now() + 99999999 });
        const value = cache.get("Hello");
        expect(value).toBe("World");
        expect(cache._cache["Hello"].value).toBe("World");
    })

});
