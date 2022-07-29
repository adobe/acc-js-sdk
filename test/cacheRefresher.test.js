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


/**********************************************************************************
 * 
 * Unit tests for the cache refresher
 * 
 *********************************************************************************/


const sdk = require('../src/index.js');
const { Cache } = require('../src/cache.js');
const MetaDataCache = require('../src/metadataCache.js').MetadataCache;
const Mock = require('./mock.js').Mock;
const CacheRefresher = require('../src/cacheRefresher.js').CacheRefresher;
const delay = ms => new Promise(res => setTimeout(res, ms));
jest.setTimeout(20000);

describe('Caches', function() {

    describe("CacheRefresher cache", function () {

        it('Should call refresh', async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);
            
            await client.NLWS.xtkSession.logon();
            const cache = new Cache();
            const metadatacache = new MetaDataCache();
            const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
            const cacheRefresher = new CacheRefresher(cache, client, connectionParameters, "xtk:schema", metadatacache);

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
            await cacheRefresher.callAndRefresh();
            expect(metadatacache.get("buildNumber")).toBe("9469");
            expect(metadatacache.get("time")).toBe("2022-07-28T14:38:55.766Z");

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
            await cacheRefresher.callAndRefresh();
            expect(metadatacache.get("buildNumber")).toBe("9469");
            expect(metadatacache.get("time")).toBe("2022-07-28T14:38:55.766Z");

            // to cover call of setInterval
            await delay(15000);
            console.log("Waited 15s");

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it('Should send buildNumber when call refresh', async () => {
            const client = await Mock.makeClient();
            const logs = await Mock.withMockConsole(async () => {
                client.traceAPICalls(true);
                client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
                client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);
                client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);
                
                await client.NLWS.xtkSession.logon();
                
                const cache = new Cache();
                const metadatacache = new MetaDataCache();
                metadatacache.put("buildNumber", "9469");
                metadatacache.put("time", "2022-07-28T14:38:55.766Z");
                const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
                const cacheRefresher = new CacheRefresher(cache, client, connectionParameters, "xtk:schema", metadatacache);

                client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
                await cacheRefresher.callAndRefresh();
                expect(metadatacache.get("buildNumber")).toBe("9469");
                expect(metadatacache.get("time")).toBe("2022-07-28T14:38:55.766Z");

                client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
                
                
                await client.NLWS.xtkSession.logoff();
                
            })
            expect(logs.length).toBe(12);
            expect(logs[0]).toMatch(/SOAP.*request.*Logon/is)
            expect(logs[1]).toMatch(/SOAP.*response.*LogonResponse/is)
            expect(logs[2]).toMatch(/SOAP.*request.*GetModifiedEntities/is)
            expect(logs[3]).toMatch(/SOAP.*request.*GetModifiedEntities/is)
            expect(logs[4]).toMatch(/SOAP.*request.*buildNumber.*9469.*2022-07-28T14:38:55.766Z.*GetModifiedEntities*/is)
            expect(logs[5]).toMatch(/SOAP.*response.*GetModifiedEntitiesResponse/is)
            expect(logs[6]).toMatch(/SOAP.*response.*GetModifiedEntitiesResponse/is)
            expect(logs[7]).toMatch(/SOAP.*response.*GetModifiedEntitiesResponse/is)
            expect(logs[8]).toMatch(/cache refresh xtk:schema*/is)
            expect(logs[9]).toMatch(/Clear cache*/is)
            expect(logs[10]).toMatch(/SOAP.*request.*Logoff/is)
            expect(logs[11]).toMatch(/SOAP.*response.*LogoffResponse/is)
        });

        it('Should refresh cache', async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_RESPONSE);

            await client.NLWS.xtkSession.logon();
            const cache = new Cache();
            const metadatacache = new MetaDataCache();
            const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
            const cacheRefresher = new CacheRefresher(cache, client, connectionParameters, "xtk:schema", metadatacache);

            cache.put("xtk:schema|nms:recipient", "<content recipient>");
            cache.put("xtk:schema|nms:replicationStrategy", "<content xtk:schema|nms:replicationStrategy>");
            cache.put("xtk:schema|nms:operation", "<content xtk:schema|nms:operation>");
            expect(cache.get("xtk:schema|nms:recipient")).toBe("<content recipient>");
            expect(cache.get("xtk:schema|nms:replicationStrategy")).toBe("<content xtk:schema|nms:replicationStrategy>");
            expect(cache.get("xtk:schema|nms:operation")).toBe("<content xtk:schema|nms:operation>");

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_SCHEMA_RESPONSE);
            await cacheRefresher.callAndRefresh();
            expect(metadatacache.get("buildNumber")).toBe("9469");
            expect(metadatacache.get("time")).toBe("2022-07-28T15:32:00.785Z");
            expect(cache.get("xtk:schema|nms:recipient")).toBeUndefined();
            expect(cache.get("xtk:schema|nms:replicationStrategy")).toBeUndefined();
            expect(cache.get("xtk:schema|nms:operation")).toBe("<content xtk:schema|nms:operation>");

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it('Should stop refresh', async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_UNDEFINED_RESPONSE);
            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_UNDEFINED_RESPONSE);

            await client.NLWS.xtkSession.logon();
            const cache = new Cache();
            const metadatacache = new MetaDataCache();
            const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
            const cacheRefresher = new CacheRefresher(cache, client, connectionParameters, "xtk:schema", metadatacache);

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_UNDEFINED_RESPONSE);
            await cacheRefresher.callAndRefresh();
            expect(metadatacache.get("buildNumber")).toBeUndefined();
            expect(metadatacache.get("time")).toBeUndefined();
            expect(cacheRefresher._intervalId).toBeNull();
            
            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });
    });
});
