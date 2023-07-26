/*
Copyright 2023 Adobe. All rights reserved.
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
 * Unit tests for IMS Bearer Token authentication
 *
 *********************************************************************************/
const sdk = require('../src/index.js');
const Mock = require('./mock.js').Mock;

describe('IMS Bearer Toekn', function () {

    async function makeImsClient(options) {
        const connectionParameters = sdk.ConnectionParameters.ofImsBearerToken("http://acc-sdk:8080", "ey...", options);
        const client = await sdk.init(connectionParameters);
        if (!options || !options.transport) // allow tests to explicitely set the transport
          client._transport = jest.fn();
        return client;
      }

    it('Should logon with IMS Bearer Token', async () => {
        const client = await makeImsClient();
        // No "Logon" API call is made when using IMS Bearer Token
        //client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(client.isLogged()).toBe(true);
    });

    // The logoff API invalidates the session created on the server side and does not invalidate 
    // the bearer token. To invalidate the bearer token, IMS should be used
    it('Should logoff', async () => {
        const client = await makeImsClient();
        await client.NLWS.xtkSession.logon();

        client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
        await client.NLWS.xtkSession.logoff();
        expect(client.isLogged()).toBe(false);

        expect(client._transport).toBeCalledTimes(1);
        const calls = client._transport.mock.calls;
        expect(calls[0][0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "Authorization": "Bearer ey..."
        });
        expect(calls[0][0].headers["X-Security-Token"]).toBeUndefined();
        expect(calls[0][0].headers["X-Session-Token"]).toBeUndefined();
    });

    it('Should call API with Bearer Token', async () => {
        const client = await makeImsClient();
        await client.NLWS.xtkSession.logon();

        // Get Option
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
        var databaseId = await client.getOption("XtkDatabaseId");
        expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");

        // Check that headers were correctly populated for both calls
        expect(client._transport).toBeCalledTimes(2);
        const calls = client._transport.mock.calls;
        expect(calls[0][0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "ACC-SDK-Call-Internal": "1",
            "Authorization": "Bearer ey..."
        });
        expect(calls[0][0].headers["X-Security-Token"]).toBeUndefined();
        expect(calls[0][0].headers["X-Session-Token"]).toBeUndefined();

        expect(calls[1][0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "Authorization": "Bearer ey..."
        });
        expect(calls[1][0].headers["ACC-SDK-Call-Internal"]).toBeUndefined();
        expect(calls[1][0].headers["X-Security-Token"]).toBeUndefined();
        expect(calls[1][0].headers["X-Session-Token"]).toBeUndefined();
    });

    it("Expired session refresh client callback", async () => {

        const refreshClient = async (client) => {
            const connectionParameters = sdk.ConnectionParameters.ofImsBearerToken("http://acc-sdk:8080", "ey2...", options);
            client.reinit(connectionParameters);
            await client.NLWS.xtkSession.logon();
            return client;
        };

        const transport = jest.fn();
        const options = {
            transport: transport,
            refreshClient: refreshClient,
        };
        const connectionParameters = sdk.ConnectionParameters.ofImsBearerToken("http://acc-sdk:8080", "ey1...", options);
        const client = await sdk.init(connectionParameters);
        await client.NLWS.xtkSession.logon();

        client._transport.mockReturnValueOnce(Promise.resolve(`XSV-350008 Session has expired or is invalid. Please reconnect.`));
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_DATABASEID_RESPONSE);
        var databaseId = await client.getOption("XtkDatabaseId");
        expect(databaseId).toBe("uFE80000000000000F1FA913DD7CC7C480041161C");
        const lastCall = client._transport.mock.calls[client._transport.mock.calls.length - 1];
        expect(lastCall[0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "Authorization": "Bearer ey2..."
        });
        expect(lastCall[0].headers["X-Security-Token"]).toBeUndefined();
        expect(lastCall[0].headers["X-Session-Token"]).toBeUndefined();
    });


    it("Should call ping API", async () => {
        const client = await makeImsClient();
        await client.NLWS.xtkSession.logon();

        client._transport.mockReturnValueOnce(Mock.PING);
        const ping = await client.ping();
        expect(ping.status).toBe("OK");
        expect(ping.timestamp).toBe("2021-08-27 15:43:48.862Z");

        const lastCall = client._transport.mock.calls[client._transport.mock.calls.length - 1];
        expect(lastCall[0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "Authorization": "Bearer ey..."
        });
        expect(lastCall[0].headers["X-Security-Token"]).toBeUndefined();
        expect(lastCall[0].headers["X-Session-Token"]).toBeUndefined();
    });

    it("Should call mcPing API", async () => {
        const client = await makeImsClient();
        await client.NLWS.xtkSession.logon();

        client._transport.mockReturnValueOnce(Mock.MC_PING);
        const ping = await client.mcPing();
        expect(ping.status).toBe("Ok");

        const lastCall = client._transport.mock.calls[client._transport.mock.calls.length - 1];
        expect(lastCall[0].headers).toMatchObject({
            "ACC-SDK-Auth": "ImsBearerToken",
            "Authorization": "Bearer ey..."
        });
        expect(lastCall[0].headers["X-Security-Token"]).toBeUndefined();
        expect(lastCall[0].headers["X-Session-Token"]).toBeUndefined();
    });

    it("Should allow to use the application object", async () => {
        const client = await makeImsClient();
        await client.NLWS.xtkSession.logon();
        const application = client.application;
        expect(application).toBeDefined();

        client._transport.mockReturnValueOnce(Mock.GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE);
        const schema = await application.getSchema("nms:extAccount");
        expect(schema).toBeDefined();
        expect(schema.name).toBe("extAccount");

        // But the application object does not have any info about packages
        // since we are using a bearer token. Packages are only available
        // when using one of the Logon methods (Logno or BearertokenLogon)
        expect(application.packages).toBeUndefined();
    });

    it('Should logon with IMS Bearer Token and return session info. No version string or date', async () => {
        const client = await makeImsClient({ sessionInfo: true });
        // As session info is asked, GetUserInfo and /r/test will be called
        client._transport.mockReturnValueOnce(Promise.resolve(`<redir status='OK' build='9236' sha1='cc45440' instance='xxx_mkt_prod1' sourceIP='193.104.215.11' host='xxxol.campaign.adobe.com' localHost='xxxol-mkt-prod1-1'/>`));
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(client.isLogged()).toBe(true);
        expect(client.application.buildNumber).toBe("9236");
        expect(client.application.version).toBe(undefined);
        expect(client.application.instanceName).toBe("xxx_mkt_prod1");
        expect(client.application.operator.login).toBe("admin");
    });

    it('Should logon with IMS Bearer Token and return session info', async () => {
        const client = await makeImsClient({ sessionInfo: true });
        // As session info is asked, GetUserInfo and /r/test will be called
        client._transport.mockReturnValueOnce(Promise.resolve(`<redir status='OK' date='2021-08-27 08:02:07.963-07' version='8.5.1' build='9236' sha1='cc45440' instance='xxx_mkt_prod1' sourceIP='193.104.215.11' host='xxxol.campaign.adobe.com' localHost='xxxol-mkt-prod1-1'/>`));
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
        await client.NLWS.xtkSession.logon();
        expect(client.isLogged()).toBe(true);
        expect(client.application.buildNumber).toBe("9236");
        expect(client.application.version).toBe("8.5.1");
    });

    it('Should logon with IMS Bearer Token and return session info. Build number is missing from /r/test', async () => {
        const client = await makeImsClient({ sessionInfo: true });
        // As session info is asked, GetUserInfo and /r/test will be called
        client._transport.mockReturnValueOnce(Promise.resolve(`<redir status='OK' date='2021-08-27 08:02:07.963-07'/>`));
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
        client._transport.mockReturnValueOnce(Promise.resolve(`<?xml version='1.0'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
        <SOAP-ENV:Body>
            <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pstrValue xsi:type='xsd:string'>9999</pstrValue>
                <pbtType xsi:type='xsd:byte'>6</pbtType>
            </GetOptionResponse>
        </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`));
        // As build number is missing getOption will be called
        await client.NLWS.xtkSession.logon();
        expect(client.isLogged()).toBe(true);
        expect(client.application.buildNumber).toBe("9999");
    });

    it('Should fail to logon with IMS Bearer Token because build number is missing', async () => {
        const client = await makeImsClient({ sessionInfo: true });
        // As session info is asked, GetUserInfo and /r/test will be called
        client._transport.mockReturnValueOnce(Promise.resolve(`<redir status='OK' date='2021-08-27 08:02:07.963-07'/>`));
        client._transport.mockReturnValueOnce(Mock.GET_XTK_SESSION_SCHEMA_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_USER_INFO_RESPONSE);
        client._transport.mockReturnValueOnce(Mock.GET_OPTION_NOTFOUND_RESPONSE);
        // As build number is missing getOption will be called
        await expect(async() => {
            await client.NLWS.xtkSession.logon();
        }).rejects.toMatchObject({ errorCode: "SDK-000007" });
    });

});
