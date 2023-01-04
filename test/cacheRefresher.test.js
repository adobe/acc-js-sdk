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
const Mock = require('./mock.js').Mock;
const CacheRefresher = require('../src/cacheRefresher.js').CacheRefresher;


describe("CacheRefresher cache", function () {

    it('Should call refresh', async () => {
        const client =  await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
        await cacheRefresher._callAndRefresh();
        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T14:38:55.766Z");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
        await cacheRefresher._callAndRefresh();
        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T14:38:55.766Z");

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should call refresh after 1 seconds', async () => {
        const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
        const client = await sdk.init(connectionParameters);
        client._transport = jest.fn();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        expect(client.isLogged()).toBeTruthy();
        const cache = new Cache();

        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBeUndefined();
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBeUndefined();
        client._transport.mockReturnValue(Promise.resolve(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE));
        jest.useFakeTimers();
        cacheRefresher.startAutoRefresh(5000);
        jest.advanceTimersByTime(6000);
        jest.useRealTimers();
        
        // to allow soap call to finish
        await new Promise(process.nextTick);

        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T14:38:55.766Z");

        cacheRefresher.stopAutoRefresh();
        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should send buildNumber when call refresh', async () => {
        const client = await Mock.makeClient();
        const logs = await Mock.withMockConsole(async () => {
            client.traceAPICalls(true);
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

            await client.NLWS.xtkSession.logon();

            const cache = new Cache();

            const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");
            await cacheRefresher._refresherStateCache.put("buildNumber", "9469");
            await cacheRefresher._refresherStateCache.put("time", "2022-07-28T14:38:55.766Z");

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
            await cacheRefresher._callAndRefresh();
            await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
            await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T14:38:55.766Z");

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);


            await client.NLWS.xtkSession.logoff();

        })
        expect(logs.length).toBe(6);
        expect(logs[0]).toMatch(/SOAP.*request.*Logon/is)
        expect(logs[1]).toMatch(/SOAP.*response.*LogonResponse/is)
        expect(logs[2]).toMatch(/SOAP.*request.*buildNumber.*9469.*2022-07-28T14:38:55.766Z.*GetModifiedEntities*/is)
        expect(logs[3]).toMatch(/SOAP.*response.*GetModifiedEntitiesResponse/is)
        expect(logs[4]).toMatch(/SOAP.*request.*Logoff/is)
        expect(logs[5]).toMatch(/SOAP.*response.*LogoffResponse/is)
    });

    it('Should refresh cache', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        await cache.put("xtk:schema|nms:recipient", "<content recipient>");
        await cache.put("xtk:schema|nms:replicationStrategy", "<content xtk:schema|nms:replicationStrategy>");
        await cache.put("xtk:schema|nms:operation", "<content xtk:schema|nms:operation>");
        await expect(cache.get("xtk:schema|nms:recipient")).resolves.toBe("<content recipient>");
        await expect(cache.get("xtk:schema|nms:replicationStrategy")).resolves.toBe("<content xtk:schema|nms:replicationStrategy>");
        await expect(cache.get("xtk:schema|nms:operation")).resolves.toBe("<content xtk:schema|nms:operation>");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_SCHEMA_RESPONSE);
        await cacheRefresher._callAndRefresh();
        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T15:32:00.785Z");
        await expect(cache.get("xtk:schema|nms:recipient")).resolves.toBeUndefined();
        await expect(cache.get("xtk:schema|nms:replicationStrategy")).resolves.toBeUndefined();
        await expect(cache.get("xtk:schema|nms:operation")).resolves.toBe("<content xtk:schema|nms:operation>");

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should stop refresh if method not exist', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        cacheRefresher.startAutoRefresh();

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_UNDEFINED_RESPONSE);
        await cacheRefresher._callAndRefresh();
        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBeUndefined();
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBeUndefined();
        expect(cacheRefresher._intervalId).toBeNull();

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should not stop refresh if error different from undefined', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        cacheRefresher.startAutoRefresh();

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_ERROR_RESPONSE);
        try {
            await cacheRefresher._callAndRefresh();
            fail('exception is expected');
        } catch (e) {
            expect(e).not.toBeNull();
        }
        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBeUndefined();
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBeUndefined();
        expect(cacheRefresher._intervalId).not.toBeNull();

        cacheRefresher.stopAutoRefresh();
        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should be able to call start refresh twice', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        jest.useFakeTimers();
        cacheRefresher.startAutoRefresh(100000);
        expect(cacheRefresher._intervalId).not.toBeNull();
        const firstIntervalId = cacheRefresher._intervalId;
        cacheRefresher.startAutoRefresh(5000);
        expect(cacheRefresher._intervalId).not.toBeNull();
        expect(cacheRefresher._intervalId != firstIntervalId);

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
        
        jest.advanceTimersByTime(6000);
        jest.useRealTimers();

        // to allow soap call to finish
        await new Promise(process.nextTick);

        await expect(cacheRefresher._refresherStateCache.get("buildNumber")).resolves.toBe("9469");
        await expect(cacheRefresher._refresherStateCache.get("time")).resolves.toBe("2022-07-28T14:38:55.766Z");

        cacheRefresher.stopAutoRefresh();
        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });

    it('Should notify when refresh cache', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);


        class Listener {
            constructor() {
                this._schemas = {};
            }
            add(schemaId) {
                this._schemas[schemaId] = "1";
            }

            invalidateCacheItem(schemaId) {
                this._schemas[schemaId] = undefined;
            }
            getSchema(schemaId) {
                return this._schemas[schemaId];
            }
        }

        let listener = new Listener();
        client._registerCacheChangeListener(listener);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        cache.put("xtk:schema|nms:recipient", "<content recipient>");
        cache.put("xtk:schema|nms:replicationStrategy", "<content xtk:schema|nms:replicationStrategy>");
        cache.put("xtk:schema|nms:operation", "<content xtk:schema|nms:operation>");

        listener.add("nms:recipient");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_SCHEMA_RESPONSE);
        await cacheRefresher._callAndRefresh();

        expect(listener.getSchema("nms:recipient")).toBeUndefined();

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        client._unregisterCacheChangeListener(listener);
    });

    it('Should protect callAndRefresh from re-entrance', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");
        let count = 0;
        cacheRefresher._callAndRefresh = jest.fn(() => { count = count + 1 });
        expect(cacheRefresher._running).toBe(false);
        await cacheRefresher._callAndRefresh();
        expect(count).toBe(1);
        expect(cacheRefresher._running).toBe(false);
        await cacheRefresher._safeCallAndRefresh();
        expect(count).toBe(2);
        expect(cacheRefresher._running).toBe(false);

        cacheRefresher._running = true;
        await cacheRefresher._safeCallAndRefresh();
        expect(count).toBe(2); // should not have been called since already executing
    })

    it('Throw CampaignException when calling _callAndRefresh without logon', async () => {
        const client = await Mock.makeClient();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        try {
            await cacheRefresher._callAndRefresh();
             fail('exception is expected');
         } catch (e) {
             expect(e.name).toBe("CampaignException");
             expect(e.errorCode).toBe("SDK-000010");
         }
    });

    it('Ignore error when calling _safeCallAndRefresh without logon', async () => {
        const client = await Mock.makeClient();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        try {
            await cacheRefresher._safeCallAndRefresh();
        } catch (e) {
            fail('exception is not expected');
         }
    });

    it('Catch error in soap call GetModifiedEntities and display a warning', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const cacheRefresher = new CacheRefresher(cache, client, "xtk:schema", "rootkey");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_ERROR_RESPONSE);
        try {
          jest.useFakeTimers();
          cacheRefresher.startAutoRefresh(5000);
          jest.advanceTimersByTime(6000);
          jest.useRealTimers();

          // to allow soap call to finish
          await new Promise(process.nextTick);
        } catch (e) {
            fail('exception is not expected');
        }

        cacheRefresher.stopAutoRefresh();
        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
    });
});
