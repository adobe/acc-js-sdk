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
        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
        expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T14:38:55.766Z");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
        await cacheRefresher._callAndRefresh();
        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
        expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T14:38:55.766Z");

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

        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBeUndefined();
        expect(cacheRefresher._refresherStateCache.get("time")).toBeUndefined();
        client._transport.mockReturnValue(Promise.resolve(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE));
        jest.useFakeTimers();
        cacheRefresher.startAutoRefresh(5000);
        jest.advanceTimersByTime(6000);
        jest.useRealTimers();
        
        // to allow soap call to finish
        await new Promise(process.nextTick);

        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
        expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T14:38:55.766Z");

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
            cacheRefresher._refresherStateCache.put("buildNumber", "9469");
            cacheRefresher._refresherStateCache.put("time", "2022-07-28T14:38:55.766Z");

            client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
            await cacheRefresher._callAndRefresh();
            expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
            expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T14:38:55.766Z");

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

        cache.put("xtk:schema|nms:recipient", "<content recipient>");
        cache.put("xtk:schema|nms:replicationStrategy", "<content xtk:schema|nms:replicationStrategy>");
        cache.put("xtk:schema|nms:operation", "<content xtk:schema|nms:operation>");
        expect(cache.get("xtk:schema|nms:recipient")).toBe("<content recipient>");
        expect(cache.get("xtk:schema|nms:replicationStrategy")).toBe("<content xtk:schema|nms:replicationStrategy>");
        expect(cache.get("xtk:schema|nms:operation")).toBe("<content xtk:schema|nms:operation>");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_SCHEMA_RESPONSE);
        await cacheRefresher._callAndRefresh();
        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
        expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T15:32:00.785Z");
        expect(cache.get("xtk:schema|nms:recipient")).toBeUndefined();
        expect(cache.get("xtk:schema|nms:replicationStrategy")).toBeUndefined();
        expect(cache.get("xtk:schema|nms:operation")).toBe("<content xtk:schema|nms:operation>");

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
        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBeUndefined();
        expect(cacheRefresher._refresherStateCache.get("time")).toBeUndefined();
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
        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBeUndefined();
        expect(cacheRefresher._refresherStateCache.get("time")).toBeUndefined();
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

        expect(cacheRefresher._refresherStateCache.get("buildNumber")).toBe("9469");
        expect(cacheRefresher._refresherStateCache.get("time")).toBe("2022-07-28T14:38:55.766Z");

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

    it('Should not call refresh without logon', async () => {
        const client = await Mock.makeClient();
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);

        //await client.NLWS.xtkSession.logon();
        const cache = new Cache();
        const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin");
        const cacheRefresher = new CacheRefresher(cache, client, connectionParameters, "xtk:schema", "rootkey");

        client._transport.mockReturnValueOnce(Mock.GETMODIFIEDENTITIES_CLEAR_RESPONSE);
        try {
            await cacheRefresher.callAndRefresh();
            fail('exception is expected');
        } catch (e) {
            expect(e.name).toBe("CampaignException");
            expect(e.errorCode).toBe("SDK-000010");
        }
    });
});
