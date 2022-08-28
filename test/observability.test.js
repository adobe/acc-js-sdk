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
 * Unit tests for the ACC client observability hooks
 * 
 *********************************************************************************/
const sdk = require('../src/index.js');
const Mock = require('./mock.js').Mock;

const makeObservableClient = async(options, callback) => {
    // No TTL for option cache so that we can test that we send cache stats every 5 mins
    const client = await Mock.makeClient({ ...options, optionCacheTTL: 999999000 });
    return [client, new ObservabilityAssertion(client, callback)];
}

class ObservabilityAssertion {
    constructor(client, callback) {
        const that = this;
        this._callback = callback;
        client.registerObserver({
            event: (event, parentEvent) => { return that.onEvent(event, parentEvent); },
        });
        this._eventsByName = {};
    }

    onEvent(event, parentEvent) {
        if (!this._eventsByName[event.eventName]) this._eventsByName[event.eventName] = [];
        this._eventsByName[event.eventName].push({ event: event, parentEvent: parentEvent });
        if (this._callback) this._callback.call(this, event, parentEvent);
    }

    hasObserved(eventName) {
        if (!this._eventsByName[eventName]) return false;
        return this._eventsByName[eventName].length > 0;
    }
    
    getFirstObserved(eventName) {
        if (!this._eventsByName[eventName]) return;
        return this._eventsByName[eventName][0];
    }

    getObserved(eventName) {
        if (!this._eventsByName[eventName]) [];
        return this._eventsByName[eventName].filter(o => o.event.eventName === eventName).map(o => o.event);
    }
}

describe('ACC Client Observability', function () {

    it('Should observe logon and logoff', async function () {
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);
        expect(assertion.hasObserved("SDK//logoff")).toBe(false);;
        const logon = assertion.getFirstObserved("SDK//logon");
        expect(logon.parentEvent).toBeUndefined();
        expect(logon.event).toMatchObject({ eventId: 1, eventName: "SDK//logon" });
        expect(logon.event.timestamp).toBeGreaterThan(0);

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        expect(assertion.hasObserved("SDK//logoff")).toBe(true);
        const logoff = assertion.getFirstObserved("SDK//logoff");
        expect(logoff.event).toMatchObject({ eventName: "SDK//logoff" });
        expect(logoff.event.eventId).toBeGreaterThan(1);
        expect(logoff.event.timestamp).toBeGreaterThanOrEqual(logon.event.timestamp);

        // there should not be an auto refresh event if auto-refresh mechanism
        // is off
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(false);
    });

    it('Should ignore exceptions throws from observer', async () => {
        const [client, assertion] = await makeObservableClient({}, (event, parentEvent) => {
            throw new Error("Simulated failure in observer");
        });
        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        // logon will send an observability event, but the error will be logged and ignored
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);
    });

    it('Should send internal stats every 5 minutes', async () => {
        jest.useFakeTimers();
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);

        // Calling get option should generate some cache hits
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
        var databaseId = await client.getOption("XtkDatabaseId");
        expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");

        jest.advanceTimersByTime(310000);
        client._trackEvent("TEST/dummy", undefined, {});
        // Note: options cache is written twice: once in the SOAP call itself, and once by the getOption method
        // entity cache is also written twice: once for xtk:session and once from xtk:persist
        expect(assertion.getObserved("CACHE//stats")).toEqual(expect.arrayContaining(
            [
                expect.objectContaining({ payload: { name: 'entityCache', clears: 0, loads: 1, memoryHits: 0, reads: 1, removals: 0, saves: 2, storageHits: 0, writes: 2 } }),
                expect.objectContaining({ payload: { name: 'optionCache', clears: 0, loads: 1, memoryHits: 0, reads: 1, removals: 0, saves: 2, storageHits: 0, writes: 2 } }),
            ]
        ));

        // Calling get option again should make a cache hit
        // Only work if options cache TTL is very high
        databaseId = await client.getOption("XtkDatabaseId");
        expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
        jest.advanceTimersByTime(310000);
        client._trackEvent("TEST/dummy", undefined, {});
        expect(assertion.getObserved("CACHE//stats")).toEqual(expect.arrayContaining(
            [
                expect.objectContaining({ payload: { name: 'entityCache', clears: 0, loads: 1, memoryHits: 0, reads: 1, removals: 0, saves: 2, storageHits: 0, writes: 2 } }),
                expect.objectContaining({ payload: { name: 'optionCache', clears: 0, loads: 1, memoryHits: 1, reads: 2, removals: 0, saves: 2, storageHits: 0, writes: 2 } }),
            ]
        ));

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        expect(assertion.hasObserved("SDK//logoff")).toBe(true);

        jest.useRealTimers();
    });

    it('_trackCacheStats should support cache with no stats', async () => {
        const [client, assertion] = await makeObservableClient();
        client._trackEvent = jest.fn();
        client._trackCacheStats('hello', undefined);
        expect(client._trackEvent.mock.calls.length).toBe(0);
        client._trackCacheStats('hello', {});
        expect(client._trackEvent.mock.calls.length).toBe(0);
        client._trackCacheStats('hello', { _stats: {} });
        expect(client._trackEvent.mock.calls.length).toBe(1);
    });

    it('Should track SOAP calls', async () => {
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);

        // Calling get option should generate some cache hits
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
        var databaseId = await client.getOption("XtkDatabaseId");
        expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
        const requests = assertion.getObserved("SOAP//request");
        expect(requests.length).toBe(3);
        expect(requests[0].payload).toMatchObject({ internal: false, urn: 'xtk:session', methodName: 'Logon', retry: false, retryCount: 0 });
        expect(requests[1].payload).toMatchObject({ internal: true, urn: 'xtk:persist', methodName: 'GetEntityIfMoreRecent', retry: false, retryCount: 0 });
        expect(requests[2].payload).toMatchObject({ internal: false, urn: 'xtk:session', methodName: 'GetOption', retry: false, retryCount: 0 });

        const responses = assertion.getObserved("SOAP//response");
        expect(responses.length).toBe(3);
        expect(responses[0].payload).toMatchObject({ });
        expect(responses[1].payload).toMatchObject({ });
        expect(responses[2].payload).toMatchObject({ });
    });

    it('Should track caches auto-refresh (error in GetModifiedEntities API)', async () => {
        jest.useFakeTimers();
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);

        client.startRefreshCaches();
        expect(assertion.hasObserved("CACHE_REFRESHER//start")).toBe(true);
        const start = assertion.getFirstObserved("CACHE_REFRESHER//start");
        expect(start.event).toMatchObject({ eventName:"CACHE_REFRESHER//start", payload:{ cacheSchemaId: "xtk:option", refreshFrequency: 10000 } });

        // No mock implementation => the API call to get modified entities will fail generating a CACHE_REFRESHER//error event
        await client._optionCacheRefresher._safeCallAndRefresh();
        expect(assertion.hasObserved("CACHE_REFRESHER//tick")).toBe(true);
        const tick = assertion.getFirstObserved("CACHE_REFRESHER//tick");
        expect(tick.event).toMatchObject({ eventName:"CACHE_REFRESHER//tick", payload:{ cacheSchemaId: "xtk:option" } });
        expect(assertion.hasObserved("CACHE_REFRESHER//error")).toBe(true);
        const error = assertion.getFirstObserved("CACHE_REFRESHER//error");
        expect(error.event).toMatchObject({ eventName:"CACHE_REFRESHER//error", payload:{ cacheSchemaId: "xtk:option" } });
        // An error in the API should not stop the auto-refresh mechanism
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(false);

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        expect(assertion.hasObserved("SDK//logoff")).toBe(true);
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(true);
        jest.useRealTimers();
    });

    it('Should track caches auto-refresh (success in GetModifiedEntities API)', async () => {
        jest.useFakeTimers();
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);

        client.startRefreshCaches();
        expect(assertion.hasObserved("CACHE_REFRESHER//start")).toBe(true);
        const start = assertion.getFirstObserved("CACHE_REFRESHER//start");
        expect(start.event).toMatchObject({ eventName:"CACHE_REFRESHER//start", payload:{ cacheSchemaId: "xtk:option", refreshFrequency: 10000 } });

        client._transport.mockReturnValue(Promise.resolve(Mock.GETMODIFIEDENTITIES_RESPONSE));
        await client._optionCacheRefresher._safeCallAndRefresh();
        expect(assertion.hasObserved("CACHE_REFRESHER//tick")).toBe(true);
        const tick = assertion.getFirstObserved("CACHE_REFRESHER//tick");
        expect(tick.event).toMatchObject({ eventName:"CACHE_REFRESHER//tick", payload:{ cacheSchemaId: "xtk:option" } });
        expect(assertion.hasObserved("CACHE_REFRESHER//error")).toBe(false);
        expect(assertion.hasObserved("CACHE_REFRESHER//abort")).toBe(false);
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(false);

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        expect(assertion.hasObserved("SDK//logoff")).toBe(true);
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(true);
        jest.useRealTimers();
    });

    it('Should track caches auto-refresh (GetModifiedEntities API missing)', async () => {
        jest.useFakeTimers();
        const [client, assertion] = await makeObservableClient();

        client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(assertion.hasObserved("SDK//logon")).toBe(true);

        client.startRefreshCaches();
        expect(assertion.hasObserved("CACHE_REFRESHER//start")).toBe(true);
        const start = assertion.getFirstObserved("CACHE_REFRESHER//start");
        expect(start.event).toMatchObject({ eventName:"CACHE_REFRESHER//start", payload:{ cacheSchemaId: "xtk:option", refreshFrequency: 10000 } });

        client._transport.mockReturnValue(Promise.resolve(Mock.GETMODIFIEDENTITIES_UNDEFINED_RESPONSE));
        await client._optionCacheRefresher._safeCallAndRefresh();
        expect(assertion.hasObserved("CACHE_REFRESHER//tick")).toBe(true);
        const tick = assertion.getFirstObserved("CACHE_REFRESHER//tick");
        expect(tick.event).toMatchObject({ eventName:"CACHE_REFRESHER//tick", payload:{ cacheSchemaId: "xtk:option" } });
        expect(assertion.hasObserved("CACHE_REFRESHER//error")).toBe(false);
        // Should send an abort event and stop the auto-refresher
        expect(assertion.hasObserved("CACHE_REFRESHER//abort")).toBe(true);
        expect(assertion.hasObserved("CACHE_REFRESHER//stop")).toBe(true);

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        jest.useRealTimers();
    });

});

