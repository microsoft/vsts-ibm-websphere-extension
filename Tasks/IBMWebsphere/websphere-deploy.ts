/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

import fs = require('fs');
import path = require('path');
import tl = require('vsts-task-lib/task');
import os = require('os');

import { ToolRunner, IExecResult } from 'vsts-task-lib/toolrunner';

function isValidFilePath(filePath: string): boolean {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

// Attempts to find a single file to use by the task.
// If a glob pattern is provided, only a single file is allowed.
function findFile(filePath: string): string {
    let paths: string[] = tl.glob(filePath);
    if (!paths || paths.length === 0) {
        throw new Error(tl.loc('NoFilesFound', filePath));
    }
    if (paths.length > 1) {
        throw new Error(tl.loc('MultipleFilesFound', filePath));
    }
    return paths[0];
}

// Get and set websphere connection spec variables
function setConnectionSpec(tr: ToolRunner): ToolRunner {
    let connType: string = tl.getInput('connType', true);
    if (connType === 'address') {

        let ipAddress: string = tl.getInput('ipAddress', true);
        let port: string = tl.getInput('port', false);

        let username: string = tl.getInput('username', false);
        let password: string = tl.getInput('password', false);

        setupIntegrationNodeSpec(tr, ipAddress, port, username, password);

    } else if (connType === 'serviceEndpoint') {
        let serverEndpoint: string = tl.getInput('websphereEndpoint', true);
        let ipAddress: string = tl.getEndpointDataParameter(serverEndpoint, 'ipAddress', false);
        let port: string = tl.getEndpointDataParameter(serverEndpoint, 'port', true);

        let username: string = tl.getEndpointAuthorizationParameter(serverEndpoint, 'username', true);
        let password: string = tl.getEndpointAuthorizationParameter(serverEndpoint, 'password', true);
        setupIntegrationNodeSpec(tr, ipAddress, port, username, password);
    }
    tr.arg(['-conntype', 'SOAP']);
    return tr;
}

function setupIntegrationNodeSpec(tr: ToolRunner, ipAddress: string, port: string, username: string, password: string): void {
        if (username) {
            tr.arg(['-username', username]);
            if (password) {
                tr.arg(['-password', password]);
            }
        }

        if (ipAddress) {
            tr.arg(['-host', ipAddress]);
            if (port) {
                tr.arg(['-port', port]);
            }
        }
}

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));
        let appName: string = tl.getInput('appName', true);
        let contentPath: string = tl.getInput('contentPath', true);
        let contentFile: string = findFile(contentPath);
        if (!isValidFilePath(contentFile)) {
            throw new Error(tl.loc('InvalidFile'));
        }
        tl.debug('input content file: ' + contentFile);
        let installApplicationIfNotExist: boolean = tl.getBoolInput('installApplicationIfNotExist', true);
        let wasCommnad: string;
        if (os.type().match(/^Win/)) {
            wasCommnad = 'wsadmin';
        } else {
            wasCommnad = 'wsadmin.sh';
        }

        // Determine if the application exists. If it exists, update; otherwise install.
        let wsadminFind: ToolRunner = tl.tool(tl.which(wasCommnad, true));
        wsadminFind = setConnectionSpec(wsadminFind);
        let findAppCommand = `AdminConfig.getid('/Deployment:${appName}/');`;
        wsadminFind.arg(['-c', findAppCommand]);
        let findApp: IExecResult = wsadminFind.execSync();
        let appNotExist: boolean = findApp.stdout.indexOf(appName) === -1;
        if (appNotExist) {
            console.log(tl.loc('NotFoundApp', appName));
        } else {
            console.log(tl.loc('FoundApp', appName));
        }

        // Prepare and run the install / update wsadmin command.
        let command: string;
        if (installApplicationIfNotExist === true && appNotExist) {
            tl.debug('install new application');

            // get target server related information
            let nodeName: string = tl.getInput('nodeName', false);
            let appServerName: string = tl.getInput('appServerName', false);
            let cellName: string = tl.getInput('cellName', false);

            // get web module and virtual host related options
            let webModule: string = tl.getInput('webModule', false);
            let virtualHost: string = tl.getInput('virtualHost', false);
            let uri: string = tl.getInput('uri', false);
            let contextRoot: string = tl.getInput('contextRoot', false) || ('/' + appName);

            // automatically extract web module, virtual host, and uri informatio from the application file.
            if (!webModule || !virtualHost || !uri) {
                let wsadminExtract: ToolRunner = tl.tool(tl.which(wasCommnad, true));
                wsadminExtract = setConnectionSpec(wsadminExtract);
                let extractAppCommand = `AdminApp.taskInfo('${contentFile}', 'MapWebModToVH');`;
                wsadminExtract.arg(['-c', extractAppCommand]);
                let appInfo: IExecResult = wsadminExtract.execSync();
                let autoWebModule: string = appInfo.stdout.match(/(Web module:\s)(.*?)\\n/)[2];
                let autoUri: string = appInfo.stdout.match(/(URI:\s)(.*?)\\n/)[2];
                let autoVirtualHost: string = appInfo.stdout.match(/(Virtual host:\s)(.*?)\\n/)[2];
                console.log(tl.loc('ExtractInfo', autoWebModule, autoVirtualHost, autoUri));
                if (!webModule) {
                    webModule = autoWebModule;
                }
                if (!virtualHost) {
                    virtualHost = autoVirtualHost;
                }
                if (!uri) {
                    uri = autoUri;
                }
            }

            let startApplication: boolean = tl.getBoolInput('startApplication', false);
            let installOptions: string = tl.getInput('installOptions', false);
            if (!installOptions) {
                command = `AdminApp.install('${contentFile}', '[-appname ${appName} -node ${nodeName} -server ${appServerName} -cell ${cellName} -MapWebModToVH [["${webModule}" "${uri}" "${virtualHost}"]] -contextroot ${contextRoot}]'); AdminConfig.save(); `;
            } else {
                command = `AdminApp.install('${contentFile}', '[-appname ${appName} -node ${nodeName} -server ${appServerName} -cell ${cellName} -MapWebModToVH [["${webModule}" "${uri}" "${virtualHost}"]] -contextroot ${contextRoot} ${installOptions}]'); AdminConfig.save(); `;
            }
            if (startApplication) {
                let startAppCommmand: string = `appManager = AdminControl.queryNames('cell=${cellName},node=${nodeName},type=ApplicationManager,process=${appServerName},*'); AdminControl.invoke(appManager, 'startApplication', '${appName}');`;
                command += startAppCommmand;
            }
        } else {
            tl.debug('update existing application');
            let updateOptions: string = tl.getInput('updateOptions', false);
            if (!updateOptions) {
                command = `AdminApp.update('${appName}', 'app', '[-operation update -contents ${contentFile}]');  AdminConfig.save();`;
            } else {
                command = `AdminApp.update('${appName}', 'app', '[-operation update -contents ${contentFile} ${updateOptions}]');  AdminConfig.save();`;
            }
        }

        let wsadmin: ToolRunner = tl.tool(tl.which(wasCommnad, true));
        wsadmin = setConnectionSpec(wsadmin);
        wsadmin.arg(['-c', command]);
        await wsadmin.exec();
        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyPublished', appName));

    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();
