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
 * Unit tests for the ACC client
 *
 *********************************************************************************/

const DomUtil = require('../src/domUtil.js').DomUtil;
const Mock = require('./mock.js').Mock;
const { XtkJobInterface } = require('../src/xtkJob.js');


const MOCK_SUBMIT_JOB_RESPONSE = (jobId) => Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema'
  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
  xmlns:ns='urn:nms:delivery'
  xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
  <SOAP-ENV:Body>
    <SubmitResponse xmlns='urn:nms:delivery' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
      <pstrId xsi:type='xsd:string'>${jobId}</pstrId>
    </SubmitResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const MOCK_GETSTATUS1_RESPONSE = (status, current, max, warning, logs) => Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema'
  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
  xmlns:ns='urn:xtk:job'
  xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
  <SOAP-ENV:Body>
    <GetStatusResponse xmlns='urn:xtk:job' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
      <psStatus xsi:type='xsd:short'>${status}</psStatus>
      <pelemReturnLogs xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        ${logs ? "<elemReturnLogs>" + logs + "</elemReturnLogs>" : "<elemReturnLogs/>"}
      </pelemReturnLogs>
      <pelemProperties xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        <elemProperties warning="${warning ? 1 : 0}">
          <progress current="${current}" max="${max}"/>
        </elemProperties>
      </pelemProperties>
    </GetStatusResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);


describe('XRK Jobs', function () {

    describe("Job parsing", () => {
        it("Should parse job status", () => {
            expect(new XtkJobInterface()._makeJobStatus()).toEqual({ status:0, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus({ })).toEqual({ status:0, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 3 ])).toEqual({ status:3, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
        });

        it("Should parse logs", () => {
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: null } ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: [] } ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { iRc: "3"} } ])).toEqual({ status:1, logs:[ { iRc:3, id:0, logDate:null, logType:0, message:"", object:"" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" } } ])).toEqual({ status:1, logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: [{ id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" }] } ])).toEqual({ status:1, logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: [{ id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" }, { id:"1244", iRc:"-53", logType:"2", message:"World" }] } ])).toEqual(
                { status:1, 
                  logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" },
                         { iRc:-53, id:1244, logDate:null, logType:2, message:"World", object:"" } ], 
                  properties: { warning:false, progress: { current:0, max:0} } 
                }); 
        });

        it("Should extract error code", () => {
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { id:"1234", iRc:"3", logType:"2", message:"DLV-490009 Hello", object:"test" } } ])).toEqual({ status:1, logs:[ { iRc:3, id:1234, logDate:null, logType:2, errorCode:"DLV-490009", message:"Hello", object:"test" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { id:"1234", iRc:"3", logType:"2", message:"DLV-49000 Hello", object:"test" } } ])).toEqual({ status:1, logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"DLV-49000 Hello", object:"test" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { id:"1234", iRc:"3", logType:"2", message:"DLV-490009", object:"test" } } ])).toEqual({ status:1, logs:[ { iRc:3, id:1234, logDate:null, logType:2, errorCode:"DLV-490009", message:"", object:"test" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
        });

        it("Should parse log date", () => {
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { logDate:"" } } ])).toEqual({ status:1, logs:[  { iRc:0, id:0, logDate:null, logType:0, message:"", object:"" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, { log: { logDate:"2022-11-19 16:30:19.140Z" } } ])).toEqual({ status:1, logs:[  { iRc:0, id:0, logDate:new Date(1668875419140), logType:0, message:"", object:"" } ], properties: { warning:false, progress: { current:0, max:0} } }); 
        });

        it("Should parse progress", () => {
            expect(new XtkJobInterface()._makeJobStatus([ 1, undefined, {} ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, undefined, { progress:{} } ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:0, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, undefined, { progress:{ current:10 } } ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:10, max:0} } }); 
            expect(new XtkJobInterface()._makeJobStatus([ 1, undefined, { progress:{ current:10, max:100 } } ])).toEqual({ status:1, logs:[], properties: { warning:false, progress: { current:10, max:100} } }); 
        });

        it("Should return progress as a percentage", () => {
            const progress = (getStatusResponse) => {
                const job = new XtkJobInterface();
                const status = job._makeJobStatus(getStatusResponse);
                job._updateStatus(status);
                return job.getProgress();
            };
            expect(progress([ 1 ])).toBe(0); 
            expect(progress([ 1, undefined, {} ])).toBe(0); 
            expect(progress([ 1, undefined, { progress:{} } ])).toBe(0); 
            expect(progress([ 1, undefined, { progress:{ current:10 } } ])).toBe(0); 
            expect(progress([ 1, undefined, { progress:{ current:10, max:100 } } ])).toBe(0.1); 
        });

        it("Should return progress as a percentage (edge cases)", () => {
            const job = new XtkJobInterface();
            expect(job.getProgress()).toBe(0); 
        });
    });

    describe("Result parsing", () => {
        it("Should parse job result", () => {
            expect(new XtkJobInterface()._makeJobResult()).toEqual(undefined); 
            expect(new XtkJobInterface()._makeJobResult("Hello")).toEqual("Hello"); 
            expect(new XtkJobInterface()._makeJobResult({ hello: 'world' })).toEqual({ hello: 'world' }); 
        });
    });

    describe("Job update", () => {
        it("Should set empty status", () => {
            const job = new XtkJobInterface();
            expect(job.status).toBeUndefined();
            job._updateStatus(job._makeJobStatus());
            expect(job.status).toEqual({ status: 0, properties: { progress: { current:0, max: 0 }, warning:false }, logs: [] });
        });

        it("Should set initial status", () => {
            const job = new XtkJobInterface();
            expect(job.status).toBeUndefined();
            job._updateStatus(job._makeJobStatus([ 1, { log: [{ id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" }, { id:"1244", iRc:"-53", logType:"2", message:"World" }] } ]) );
            expect(job.status).toEqual({ status:1, 
                logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" },
                       { iRc:-53, id:1244, logDate:null, logType:2, message:"World", object:"" } ], 
                properties: { warning:false, progress: { current:0, max:0} } 
            }); 
        });

        it("Should update status", () => {
            const job = new XtkJobInterface();
            expect(job.status).toBeUndefined();
            expect(job.lastLogId).toBe(0);
            job._updateStatus(job._makeJobStatus([ 1, { log: [{ id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" }, { id:"1244", iRc:"-53", logType:"2", message:"World" }] } ]) );
            expect(job.status).toEqual({ status:1, 
                logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" },
                       { iRc:-53, id:1244, logDate:null, logType:2, message:"World", object:"" } ], 
                properties: { warning:false, progress: { current:0, max:0} } 
            }); 
            expect(job.lastLogId).toBe(1244);
            job._updateStatus(job._makeJobStatus([ 1, { log: [{ id:"1245", iRc:"3", logType:"2", message:"Hello World" }] } ]) );
            expect(job.status).toEqual({ status:1, 
                logs:[ { iRc:3, id:1234, logDate:null, logType:2, message:"Hello", object:"test" },
                       { iRc:-53, id:1244, logDate:null, logType:2, message:"World", object:"" } ,
                       { iRc:3, id:1245, logDate:null, logType:2, message:"Hello World", object:"" } ], 
                properties: { warning:false, progress: { current:0, max:0} } 
            }); 
            expect(job.lastLogId).toBe(1245);
        });

        it("Should ignore old logs when computing lastLogId", () => {
            const job = new XtkJobInterface();
            job._updateStatus(job._makeJobStatus([ 1, { log: [{ id:"1234", iRc:"3", logType:"2", message:"Hello", object:"test" }, { id:"1244", iRc:"-53", logType:"2", message:"World" }] } ]) );
            expect(job.lastLogId).toBe(1244);
            job._updateStatus(job._makeJobStatus([ 1, { log: [{ id:"1200", iRc:"3", logType:"2", message:"Hello World" }] } ]) ); // 1200 < 1234
            expect(job.lastLogId).toBe(1244);
        });
    });


    describe("Execute", () => {
        it("Execute with success", async () => {
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.execute();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Execute");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World"
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });

        it("Execute should pass extraHttpHeaders in headers", async () => {
            const extraHttpHeaders = {'x-api-key': 'check'};
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: { extraHttpHeaders }} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.execute();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Execute");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World",
                headers: extraHttpHeaders,
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });

        it("Infer schema from objects", async () => {
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { object: { xtkschema: "nms:delivery", name: "Hello World" }, method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.execute();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Execute");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: { xtkschema: "nms:delivery", name: "Hello World" }
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });

        it("Should fail if missing entity schema (with object)", async () => {
            const client = { _callMethod: jest.fn() };
            const job = new XtkJobInterface(client, { object: { name: "Hello World" }, method: "Prepare" });
            await expect(job.execute()).rejects.toMatchObject({
                "detail": "No schema was provided in soap call or object",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'undefined'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'undefined'. No schema was provided in soap call or object",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });

        it("Should fail if missing entity schema (without object)", async () => {
            const client = { _callMethod: jest.fn() };
            const job = new XtkJobInterface(client, { method: "Prepare" });
            await expect(job.execute()).rejects.toMatchObject({
                "detail": "No schema was provided in soap call or object",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'undefined'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'undefined'. No schema was provided in soap call or object",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });
    });

    describe("Submit", () => {
        it("Submit with success", async () => {
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.submit();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Submit");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World"
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });

        it("Submit should pass extraHttpHeaders in headers", async () => {
            const extraHttpHeaders = {'x-api-key': 'check'};
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: { extraHttpHeaders }} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.submit();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Submit");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World",
                headers: extraHttpHeaders,
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });

        it("Infer schema from objects", async () => {
            const client = { _callMethod: jest.fn(), _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { object: { xtkschema: "nms:delivery", name: "Hello World" }, method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            const jobId = await job.submit();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("Submit");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: { xtkschema: "nms:delivery", name: "Hello World" }
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ "Prepare" ]);
        });


        it("Should fail if missing entity schema (with object)", async () => {
            const client = { _callMethod: jest.fn() };
            const job = new XtkJobInterface(client, { object: { name: "Hello World" }, method: "Prepare" });
            await expect(job.submit()).rejects.toMatchObject({
                "detail": "No schema was provided in soap call or object",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'undefined'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'undefined'. No schema was provided in soap call or object",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });

        it("Should fail if missing entity schema (without object)", async () => {
            const client = { _callMethod: jest.fn() };
            const job = new XtkJobInterface(client, { method: "Prepare" });
            await expect(job.submit()).rejects.toMatchObject({
                "detail": "No schema was provided in soap call or object",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'undefined'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'undefined'. No schema was provided in soap call or object",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });
    });

    describe("SubmitSoapCall", () => {
        it("SubmitSoapCall with success", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(true));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse("<method></method>").documentElement);
            const jobId = await job.submitSoapCall();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("SubmitSoapCall");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World",
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual([ {
                name: "Prepare",
                service: "nms:delivery",
                param: [
                    { name:"this", type:"DOMDocument", value: "Hello World", },
                    { name:"bStart", type:"boolean", value:"false" },
                ]
            } ]);
        });

        it("SubmitSoapCall should pass extraHttpHeaders in headers", async () => {
            const extraHttpHeaders = {'x-api-key': 'check'};
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: { extraHttpHeaders }} };
            const job = new XtkJobInterface(client, { xtkschema: "nms:delivery", object: "Hello World", method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(true));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse("<method></method>").documentElement);
            const jobId = await job.submitSoapCall();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("SubmitSoapCall");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: "Hello World",
                headers: extraHttpHeaders,
            });
        });

        it("SubmitSoapCall a non-persistant and static job with success", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const jobDescription = { 
                doNotPersist: "true",
                xtkschema: 'nms:webApp',
                id: "9876",
                properties: {
                    warning: false,
                }};
            const soapCallArgs =  [
                {
                  where: {
                    condition: {
                      expr: "@id=9876"
                    }
                  }
                },
                {
                  type: "byte",
                  value: "10"
                }
              ]
            const job = new XtkJobInterface(client, { xtkschema: "nms:webApp", jobId: "9876", method: "Publish", args: soapCallArgs });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(true));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse('<method static="true"></method>').documentElement);
            const jobId = await job.submitSoapCall();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls.length).toBe(1);
            expect(client._callMethod.mock.calls[0][0]).toBe("SubmitSoapCall");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:webApp",
                schemaId: "xtk:jobInterface",
                object: jobDescription,
            });
            expect(client._callMethod.mock.calls[0][2]).toEqual({                
                name: "Publish",
                service: "nms:webApp",
                param : soapCallArgs
            });
        });

        it("Infer schema from objects", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { object: { xtkschema: "nms:delivery", name: "Hello World" }, method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(true));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse("<method></method>").documentElement);
            const jobId = await job.submitSoapCall();
            expect(jobId).toBe("9876");
            expect(client._callMethod.mock.calls[0][1]).toMatchObject({
                entitySchemaId: "nms:delivery",
                schemaId: "xtk:jobInterface",
                object: { xtkschema: "nms:delivery", name: "Hello World" }
            });
        });

        it("Should fail on missing schema", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(false));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse("<method></method>").documentElement);
            await expect(job.submitSoapCall()).rejects.toMatchObject({
                "detail": "Schema 'undefined' not found",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'undefined'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'undefined'. Schema 'undefined' not found",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });

        it("Should fail on invalid schema", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { object: { xtkschema: "nms:notFound", name: "Hello World" }, method: "Prepare" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(false));
            client._methodCache.get.mockReturnValueOnce(DomUtil.parse("<method></method>").documentElement);
            await expect(job.submitSoapCall()).rejects.toMatchObject({
                "detail": "Schema 'nms:notFound' not found",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'Prepare' of schema 'nms:notFound'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'Prepare' of schema 'nms:notFound'. Schema 'nms:notFound' not found",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });

        it("Should fail on method not found", async () => {
            const client = { _callMethod: jest.fn(), getSchema: jest.fn(), _methodCache: { get: jest.fn()}, _connectionParameters: { _options: {}} };
            const job = new XtkJobInterface(client, { object: { xtkschema: "nms:delivery", name: "Hello World" }, method: "NotFound" });
            client._callMethod.mockReturnValueOnce(Promise.resolve("9876"));
            client.getSchema.mockReturnValueOnce(Promise.resolve(true));
            client._methodCache.get.mockReturnValueOnce(undefined);
            await expect(job.submitSoapCall()).rejects.toMatchObject({
                "detail": "Method 'NotFound' of schema 'nms:delivery' not found",
                "errorCode": "SDK-000009",
                "faultCode": 16384,
                "faultString": "Unknown method 'NotFound' of schema 'nms:delivery'",
                "message": "400 - Error 16384: SDK-000009 Unknown method 'NotFound' of schema 'nms:delivery'. Method 'NotFound' of schema 'nms:delivery' not found",
                "name": "CampaignException",
                "statusCode": 400,
            });
        });
    });

    describe("Get Status", () => {
        it("Should get status", async () => {
            const client = { NLWS: { xtkJob: { getStatus: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            client.NLWS.xtkJob.getStatus.mockReturnValueOnce(Promise.resolve({ }));
            const status = await job.getStatus();
            expect(status).toEqual({ status:0, logs:[], properties: { warning:false, progress: { current:0, max:0} } });
            expect(job.status).toEqual({ status:0, logs:[], properties: { warning:false, progress: { current:0, max:0} } });
            expect(client.NLWS.xtkJob.getStatus.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.getStatus.mock.calls[0]).toEqual(["ABC", 0, 100]);
        });

        it("Should get next logs", async() => {
            const client = { NLWS: { xtkJob: { getStatus: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            client.NLWS.xtkJob.getStatus.mockReturnValueOnce(Promise.resolve([ 1, { log: [ { id: 1 } ] } ]));
            var status = await job.getStatus();
            expect(status).toEqual({ status:1, logs:[
                    { iRc:0, id:1, logDate:null, logType:0, message:"", object:"" }
                ], properties: { warning:false, progress: { current:0, max:0} } });
            expect(job.status).toEqual({ status:1, logs:[
                    { iRc:0, id:1, logDate:null, logType:0, message:"", object:"" }
                ], properties: { warning:false, progress: { current:0, max:0} } });
            expect(client.NLWS.xtkJob.getStatus.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.getStatus.mock.calls[0]).toEqual(["ABC", 0, 100]);

            client.NLWS.xtkJob.getStatus.mockReturnValueOnce(Promise.resolve([ 1, { log: [ { id: 2 }, { id: 3 } ] } ]));
            status = await job.getStatus();
            expect(status).toEqual({ status:1, logs:[
                    { iRc:0, id:1, logDate:null, logType:0, message:"", object:"" },
                    { iRc:0, id:2, logDate:null, logType:0, message:"", object:"" },
                    { iRc:0, id:3, logDate:null, logType:0, message:"", object:"" }
                ], properties: { warning:false, progress: { current:0, max:0} } });
            expect(job.status).toEqual({ status:1, logs:[
                    { iRc:0, id:1, logDate:null, logType:0, message:"", object:"" },
                    { iRc:0, id:2, logDate:null, logType:0, message:"", object:"" },
                    { iRc:0, id:3, logDate:null, logType:0, message:"", object:"" }
                ], properties: { warning:false, progress: { current:0, max:0} } });
            expect(client.NLWS.xtkJob.getStatus.mock.calls.length).toBe(2);
            expect(client.NLWS.xtkJob.getStatus.mock.calls[1]).toEqual(["ABC", 1, 100]);
        });

        it("Should get status from id", async () => {
            const client = { NLWS: { xtkJob: { getStatus: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            client.NLWS.xtkJob.getStatus.mockReturnValueOnce(Promise.resolve({ }));
            const status = await job.getStatus(12, 500);
            expect(client.NLWS.xtkJob.getStatus.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.getStatus.mock.calls[0]).toEqual(["ABC", 12, 500]);
        });

        it("Should get status from provided jobId", async () => {
            const jobId = 'ABC';
            const client = { NLWS: { xtkJob: { getStatus: jest.fn() } }  };
            const job = new XtkJobInterface(client, { jobId });
            client.NLWS.xtkJob.getStatus.mockReturnValueOnce(Promise.resolve({ }));
            await job.getStatus(12, 500);
            expect(client.NLWS.xtkJob.getStatus.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.getStatus.mock.calls[0]).toEqual([jobId, 12, 500]);
        });
    });

    describe("Get Result", () => {
        it("Should get result", async () => {
            const client = { NLWS: { xtkJob: { getResult: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            client.NLWS.xtkJob.getResult.mockReturnValueOnce(Promise.resolve("Hello"));
            const result = await job.getResult();
            expect(result).toEqual("Hello");
            expect(client.NLWS.xtkJob.getResult.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.getResult.mock.calls[0][0]).toBe("ABC");
        });
    });

    describe("Asynchronous jobs", () => {

        it("Should submit an delivery preparation", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const job = client.jobInterface({
                xtkschema: 'nms:delivery',
                method: 'Prepare',
                object: { },    // In reality should be an actual delivery object. Not passed here to simplify the test
            });

            client._transport.mockReturnValueOnce(Mock.GET_XTK_JOB_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(MOCK_SUBMIT_JOB_RESPONSE("4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM="));
            var jobId = await job.submit();
            expect(client._transport).toHaveBeenCalledTimes(3); // Logon, GetSchema(xtk:job), Submit
            expect(client._transport.mock.calls[1][0].data).toContain('<pk xsi:type="xsd:string">xtk:schema|xtk:job</pk><md5 xsi:type="xsd:string"/><mustExist xsi:type="xsd:boolean">false</mustExist></m:GetEntityIfMoreRecent>');
            expect(client._transport.mock.calls[2][0].data).toContain('<m:Submit xmlns:m="urn:xtk:jobInterface|nms:delivery"');
            expect(client._transport.mock.calls[2][0].data).toContain('<delivery xtkschema="nms:delivery"/></document><methodName xsi:type="xsd:string">Prepare</methodName>');
            expect(jobId).toBe("4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=");

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();
        });

        it("Should submit an delivery preparation and get status", async () => {
            const client = await Mock.makeClient();
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const job = client.jobInterface({
                xtkschema: 'nms:delivery',
                method: 'Prepare',
                object: { },    // In reality should be an actual delivery object. Not passed here to simplify the test
            });
            client._transport.mockReturnValueOnce(Mock.GET_XTK_JOB_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(MOCK_SUBMIT_JOB_RESPONSE("4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM="));
            jobId = await job.submit();

            // First call to get status returns the status and a no logs
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(2, 0, 0, true));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(4); // Logon, GetSchema(xtk:job), Submit, GetStatus
            expect(client._transport.mock.calls[3][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">0</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 0,
                iRc: 0
            })
            expect(status).toMatchObject({
                status: 2,
                logs: [],
                properties: { warning: true, progress: { current: 0, max: 0 } }
            });

            // Call GetStatus again, adding some logs and making some progress
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(2, 50, 231, true, '<log iRc="0" id="1511" logDate="2022-11-19 16:30:19.140Z" logType="2" message="Target preparation in progress..." object=""/>'));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(5); // Logon, GetSchema(xtk:job), Submit, GetStatus, GetStatus
            expect(client._transport.mock.calls[4][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">0</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 1511,
                iRc: 0
            })
            expect(status).toMatchObject({
                status: 2,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" }
                ],
                properties: { warning: true, progress: { current: 50, max: 231 } }
            });

            // Call GetStatus again, adding some logs and making some progress and change status
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(3, 231, 231, true, '<log iRc="16384" id="1513" logDate="2022-11-19 16:30:19.820Z" logType="0" message="DLV-490009 You have not defined the target population of the delivery action." object="test"/>'));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(6); // Logon, GetSchema(xtk:job), Submit, GetStatus, GetStatus
            expect(client._transport.mock.calls[5][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">1511</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 1513,
                iRc: 16384,
                lastErrorCode: "DLV-490009",
                firstErrorCode: "DLV-490009"
            })
            expect(status).toMatchObject({
                status: 3,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" },
                    { iRc: 16384, id: 1513, logDate: new Date(1668875419820), logType: 0, errorCode: "DLV-490009", message: "You have not defined the target population of the delivery action.", object: "test" },
                ],
                properties: { warning: true, progress: { current: 231, max: 231 } }
            });
            expect(job.status).toMatchObject({
                status: 3,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" },
                    { iRc: 16384, id: 1513, logDate: new Date(1668875419820), logType: 0, errorCode: "DLV-490009", message: "You have not defined the target population of the delivery action.", object: "test" },
                ],
                properties: { warning: true, progress: { current: 231, max: 231 } }
            });

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();

        });

    });

    describe("Pausing anc Cancelling", () => {
        it("Should pause job", async () => {
            const client = { NLWS: { xtkJob: { pause: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            await job.pause();
            expect(client.NLWS.xtkJob.pause.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.pause.mock.calls[0]).toEqual(["ABC"]);
        });

        it("Should cancel job", async () => {
            const client = { NLWS: { xtkJob: { cancel: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            await job.cancel();
            expect(client.NLWS.xtkJob.cancel.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.cancel.mock.calls[0]).toEqual(["ABC"]);
        });

        it("Should waitJobCancelled job", async () => {
            const client = { NLWS: { xtkJob: { waitJobCancelled: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            await job.waitJobCancelled(7);
            expect(client.NLWS.xtkJob.waitJobCancelled.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.waitJobCancelled.mock.calls[0]).toEqual(["ABC", 7]);
        });

        it("Should test if job has warnings", async () => {
            const client = { NLWS: { xtkJob: { hasWarning: jest.fn() } }  };
            const job = new XtkJobInterface(client);
            job.jobId = "ABC";
            client.NLWS.xtkJob.hasWarning.mockReturnValueOnce(1);
            const hasWarning = await job.hasWarning();
            expect(hasWarning).toBe(true);
            expect(client.NLWS.xtkJob.hasWarning.mock.calls.length).toBe(1);
            expect(client.NLWS.xtkJob.hasWarning.mock.calls[0]).toEqual(["ABC"]);
        });
    });


    describe("XML Representation", () => {
        it("Should submit an delivery preparation and get status", async () => {
            const client = await Mock.makeClient({ representation: "xml" });
            client._transport.mockReturnValueOnce(Mock.LOGON_RESPONSE);
            await client.NLWS.xtkSession.logon();
            const job = client.jobInterface({
                xtkschema: 'nms:delivery',
                method: 'Prepare',
                object: DomUtil.parse('<delivery></delivery>'),    // In reality should be an actual delivery object. Not passed here to simplify the test
            });
            client._transport.mockReturnValueOnce(Mock.GET_XTK_JOB_SCHEMA_RESPONSE);
            client._transport.mockReturnValueOnce(MOCK_SUBMIT_JOB_RESPONSE("4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM="));
            jobId = await job.submit();

            // First call to get status returns the status and a no logs
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(2, 0, 0, true));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(4); // Logon, GetSchema(xtk:job), Submit, GetStatus
            expect(client._transport.mock.calls[3][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">0</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 0,
                iRc: 0
            })
            expect(status).toMatchObject({
                status: 2,
                logs: [],
                properties: { warning: true, progress: { current: 0, max: 0 } }
            });

            // Call GetStatus again, adding some logs and making some progress
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(2, 50, 231, true, '<log iRc="0" id="1511" logDate="2022-11-19 16:30:19.140Z" logType="2" message="Target preparation in progress..." object=""/>'));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(5); // Logon, GetSchema(xtk:job), Submit, GetStatus, GetStatus
            expect(client._transport.mock.calls[4][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">0</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 1511,
                iRc: 0
            })
            expect(status).toMatchObject({
                status: 2,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" }
                ],
                properties: { warning: true, progress: { current: 50, max: 231 } }
            });

            // Call GetStatus again, adding some logs and making some progress and change status
            client._transport.mockReturnValueOnce(MOCK_GETSTATUS1_RESPONSE(3, 231, 231, true, '<log iRc="16384" id="1513" logDate="2022-11-19 16:30:19.820Z" logType="0" message="DLV-490009 You have not defined the target population of the delivery action." object="test"/>'));
            var status = await job.getStatus();
            expect(client._transport).toHaveBeenCalledTimes(6); // Logon, GetSchema(xtk:job), Submit, GetStatus, GetStatus
            expect(client._transport.mock.calls[5][0].data).toContain('<id xsi:type=\"xsd:string\">4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=</id><lastLogId xsi:type=\"xsd:int\">1511</lastLogId><maxLogCount xsi:type=\"xsd:int\">100</maxLogCount></m:GetStatus>');
            expect(job).toMatchObject({
                jobId: "4210/nms:delivery@@B/C1boHl4jx1AEnDTI4nI137QkcFiiIZf4v++eFsPdM=",
                lastLogId: 1513,
                iRc: 16384,
                lastErrorCode: "DLV-490009",
                firstErrorCode: "DLV-490009"
            })
            expect(status).toMatchObject({
                status: 3,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" },
                    { iRc: 16384, id: 1513, logDate: new Date(1668875419820), logType: 0, errorCode: "DLV-490009", message: "You have not defined the target population of the delivery action.", object: "test" },
                ],
                properties: { warning: true, progress: { current: 231, max: 231 } }
            });
            expect(job.status).toMatchObject({
                status: 3,
                logs: [
                    { iRc: 0, id: 1511, logDate: new Date(1668875419140), logType: 2, message: "Target preparation in progress...", object: "" },
                    { iRc: 16384, id: 1513, logDate: new Date(1668875419820), logType: 0, errorCode: "DLV-490009", message: "You have not defined the target population of the delivery action.", object: "test" },
                ],
                properties: { warning: true, progress: { current: 231, max: 231 } }
            });

            client._transport.mockReturnValueOnce(Mock.LOGOFF_RESPONSE);
            await client.NLWS.xtkSession.logoff();

        });
    });

    
});
