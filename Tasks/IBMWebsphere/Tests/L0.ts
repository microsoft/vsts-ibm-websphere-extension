 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

// npm install mocha --save-dev
// typings install dt~mocha --save --global

import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'vsts-task-lib/mock-test';

describe('IBM Websphere L0 Suite', function () {
    /* tslint:disable:no-empty */
    before(() => {
        process.env['TASK_TEST_TRACE'] = 1;
    });

    after(() => {
    });
    /* tslint:enable:no-empty */

    it('test if install command runs correctly', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0InstallCommand.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminConfig.getid(\'/Deployment:deepspace/\');'), 'it should have run AdminConfig.getid to test if app exists');
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.install(\'/my/deepspace.war\', \'[-appname deepspace -node myNodeName -server myAppServerName -cell myCellName -MapWebModToVH [["Bootcamp Demo App" "deepspace.war,WEB-INF/web.xml" "default_host"]] -contextroot /deepspace -installOptions myInstallOptions]\'); AdminConfig.save(); appManager = AdminControl.queryNames(\'cell=myCellName,node=myNodeName,type=ApplicationManager,process=myAppServerName,*\'); AdminControl.invoke(appManager, \'startApplication\', \'deepspace\');'), 'it should have run AdminApp.install to install app');
        assert(tr.invokedToolCount === 2, 'it should have run wsadmin command two times');
        assert(tr.stdout.indexOf('Application deepspace installed successfully.') >= 0, 'it should install successfully');
        assert(tr.stderr.length === 0, 'it should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('test if installation on cluster runs correctly', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ClusterInstallCommand.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminConfig.getid(\'/Deployment:deepspace/\');'), 'it should have run AdminConfig.getid to test if app exists');
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.install(\'/my/deepspace.war\', \'[-appname deepspace -cluster myClusterName -MapWebModToVH [["Bootcamp Demo App" "deepspace.war,WEB-INF/web.xml" "default_host"]] -contextroot /deepspace -installOptions myInstallOptions]\'); AdminConfig.save(); AdminNodeManagement.syncActiveNodes(); AdminApplication.startApplicationOnCluster(\'deepspace\', \'myClusterName\');'), 'it should have run AdminApp.install to install app on cluster');
        assert(tr.invokedToolCount === 2, 'it should have run wsadmin command two times');
        assert(tr.stdout.indexOf('Application deepspace installed successfully.') >= 0, 'it should install successfully');
        assert(tr.stderr.length === 0, 'it should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('test if update command runs correctly', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0UpdateCommand.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminConfig.getid(\'/Deployment:deepspace/\');'), 'it should have run AdminConfig.getid to test if app exists');
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.update(\'deepspace\', \'app\', \'[-operation update -contents /my/deepspace.war -updateOptions myUpdateOptions]\');  AdminConfig.save();'), 'it should have run AdminApp.update to update app');
        assert(tr.invokedToolCount === 2, 'it should have run wsadmin command two times');
        assert(tr.stdout.indexOf('Application deepspace uninstalled successfully. Application deepspace installed successfully.') >= 0, 'it should update successfully');
        assert(tr.stderr.length === 0, 'it should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('test if service endpoint works correctly', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ServiceEndpoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminConfig.getid(\'/Deployment:deepspace/\');'), 'it should have run AdminConfig.getid to test if app exists');
        assert(tr.ran('wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.install(\'/my/deepspace.war\', \'[-appname deepspace -node myNodeName -server myAppServerName -cell myCellName -MapWebModToVH [["Bootcamp Demo App" "deepspace.war,WEB-INF/web.xml" "default_host"]] -contextroot /deepspace -installOptions myInstallOptions]\'); AdminConfig.save(); appManager = AdminControl.queryNames(\'cell=myCellName,node=myNodeName,type=ApplicationManager,process=myAppServerName,*\'); AdminControl.invoke(appManager, \'startApplication\', \'deepspace\');'), 'it should have run AdminApp.install to install app');
        assert(tr.invokedToolCount === 2, 'it should have run wsadmin command three times');
        assert(tr.stdout.indexOf('Application deepspace installed successfully.') >= 0, 'it should install successfully');
        assert(tr.stderr.length === 0, 'it should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('enforce application file is valid', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0EnforceAppFileIsValid.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_InvalidFile'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('enforce only resolve to one application file', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0EnforceOneAppFile.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_MultipleFilesFound'));
        assert(tr.failed, 'task should have failed');

        done();
    });

});
