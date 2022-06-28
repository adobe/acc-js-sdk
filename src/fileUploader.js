(function () {
    const {DomUtil} = require('./domUtil.js');
    "use strict";

    class FileUploader {
        constructor(client) {
            this.client = client
        }

        /**
         * This method will be exposed
         * @param file
         * @returns {Promise<void>}
         */
        async start(file) {
            return new Promise(async (resolve, reject) => {
                var data = new FormData()
                data.append('file_noMd5', file)
                try {
                    const response = await fetch(`${this.client._connectionParameters._endpoint}/nl/jsp/uploadFile.jsp`, {
                        processData: false,
                        credentials: 'include',
                        method: 'POST',
                        body: data,
                        headers: {
                            'x-security-token': this.client._securityToken,
                            'Cookie': '__sessiontoken=' + this.client._sessionToken,
                        }
                    })
                    console.log('response', response)
                    const okay = await response.text()
                    var iframe = document.createElement('iframe');
                    iframe.style.height = 0;
                    iframe.style.width = 0;
                    document.controller = {
                        uploadFileCallBack: async (data) => {
                            const counter = await this.increaseValue(); // Step 1
                            const fileRes = await this.write(counter, data); // Step 2
                            await this.publishIfNeeded(fileRes) // Step 3
                            const url = await this.getPublicUrl(fileRes) // Step 3
                            console.log("SUCCESS", url); // Final Output
                            resolve({
                                label: data[0].fileName,
                                md5: data[0].md5,
                                type: file.type,
                                size: file.size,
                            })
                        }
                    }
                    var html = `<body>${okay}</body>`;
                    document.body.appendChild(iframe);
                    iframe.contentWindow.document.open();
                    iframe.contentWindow.document.write(html);
                    iframe.contentWindow.document.close();
                    console.log('okay', okay);

                } catch (ex) {
                    console.log('ec', ex);
                    reject(ex);
                }
            })


        }

        /**
         * Will increament the counter
         * @returns {Promise<number|*>}
         */
        async increaseValue() {
            const soapCall = this.client._prepareSoapCall('xtk:counter', 'IncreaseValue')
            soapCall.writeString('name', 'xtkResource')
            await this.client._makeSoapCall(soapCall)
            return soapCall.getNextLong();
        }

        /**
         * Will write fileRes
         * @param counter
         * @param data
         * @returns {Promise<*>}
         */
        async write(counter, data) {
            const soapCall = this.client._prepareSoapCall('xtk:persist', 'Write');
            const fileRes = soapCall.createElement("fileRes");
            fileRes.setAttribute("internalName", "RES" + counter);
            fileRes.setAttribute("md5", data[0].md5);
            fileRes.setAttribute("label", data[0].fileName);
            fileRes.setAttribute("fileName", data[0].fileName);
            fileRes.setAttribute("originalName", data[0].fileName);
            fileRes.setAttribute("useMd5AsFilename", "1");
            fileRes.setAttribute("storageType", "5");
            fileRes.setAttribute("xtkschema", "xtk:fileRes");
            soapCall.writeDocument("doc", DomUtil.parse(DomUtil.toXMLString(fileRes)));
            await this.client._makeSoapCall(soapCall)
            return fileRes;
        }

        /**
         * Will publish the file
         * @param fileRes
         * @returns {Promise<void>}
         */
        async publishIfNeeded(fileRes) {
            const soapCall = this.client._prepareSoapCall('xtk:fileRes', 'PublishIfNeeded');
            soapCall.writeDocument("entity", DomUtil.parse(DomUtil.toXMLString(fileRes)));
            //TODO: soapCall.writeDocument("params", new NL.XML.Node("params"));
            await this.client._makeSoapCall(soapCall)
        }

        /**
         * Will return the public URL of the uploaded file.
         * @param fileRes
         * @returns {Promise<string|*>}
         */
        async getPublicUrl(fileRes) {
            const soapCall = this.client._prepareSoapCall('xtk:fileRes', 'GetURL');
            soapCall.writeDocument("entity", DomUtil.parse(DomUtil.toXMLString(fileRes)));
            await this.client._makeSoapCall(soapCall)
            soapCall.getNextElement();
            return soapCall.getNextString();
        }


    }

    exports.FileUploader = FileUploader;
})();
