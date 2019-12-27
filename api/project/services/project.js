'use strict';

const fs = require('fs');

//Exec for shell command`s
const exec = require('child_process').exec;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Make cleanup project
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  cleanupProject: async (project) => {
    //Setup command
    var command = 'cleanup_server ';

    //Get path of file
    const path = require('path');
    const filePath = path.resolve() + '/public' + project.ssh_pem.url;

    //Setup pem chmod
    fs.chmodSync(filePath, 400);

    //Add project details
    command += '-n "' + project.project_name + '" ';
    command += '-a "' + project.app_name + '" ';
    command += '-u ' + project.ssh_username + ' ';
    command += '-d ' + project.ssh_host + ' ';
    command += '-s ' + filePath + ' ';

    if(project.domain_name)
      command += '-b ' + project.domain_name + ' ';
    else
      command += '-b ' + project.ssh_host + ' ';


  }
};
