'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');

//Exec for shell command`s
const exec = require('child_process').exec;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Get project output console
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  getProjectConsole: async (ctx) => {
    const user = ctx.state.user;

    const entity = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    const output = await strapi.services.console.find({
      project: entity._id.toString()
    });

    return sanitizeEntity(output, { model: strapi.models.console });
  },

  /**
   * Start setup project
   * @param ctx
   * @returns {Promise<void>}
   */
  setupProject: async (ctx) => {
    const user = ctx.state.user;

    const entity = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    const output = await strapi.services.console.find({
      project: entity._id.toString()
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    //Setup command
    var command = 'setup_server ';

    //One line command for setup repos
    if(entity.server_dependencies && entity.server_dependencies.length){

      //Also prepare list for packages names
      const packagesNames = [];

      //Prepare string
      command += '-r "';
      for(let item of entity.server_dependencies){
        if(item.repo !== '')
          command += item.repo + '; ';

        packagesNames.push(item.package);
      }
      command += '" ';

      if(packagesNames.length){
        command += '-i "';
        for(let name of packagesNames){
          command += name + ' ';
        }
        command +='" ';
      }
    }

    //Node packages
    if(entity.nodejs_dependencies && entity.nodejs_dependencies.length){
      command += '-j "';
      for(let pack of entity.nodejs_dependencies){
        command += pack.name + ' ';
      }
      command +='" ';
    }

    //Get path of file
    const path = require('path');
    const filePath = path.resolve() + '/public' + entity.ssh_pem.url;

    //Setup pem chmod
    fs.chmodSync(filePath, 400);

    //Add project details
    command += '-n "' + entity.project_name + '" ';
    command += '-a "' + entity.app_name + '" ';
    command += '-f ' + entity.project_type.value + ' ';
    command += '-p ' + entity.app_port + ' ';
    if(entity.avaliable_ports)
      command += '-w "' + entity.avaliable_ports + '" ';
    command += '-u ' + entity.ssh_username + ' ';
    command += '-s ' + filePath + ' ';


    //SSL params
    if(entity.domain_name)
      command += '-b ' + entity.domain_name + ' ';

    if(entity.lets_encrypt)
      command += '-e 1 ';
    else
      command += '-e 0 ';

    if(entity.custom_ssl_key && entity.custom_ssl_crt && entity.custom_ssl_pem)
      command += `-c "${path.resolve() + '/public' + entity.custom_ssl_key.url} ${path.resolve() + '/public' + entity.custom_ssl_crt.url} ${path.resolve() + '/public' + entity.custom_ssl_pem.url}" `

    const PROJECT_ID = entity._id.toString();

    //Exec command
    const commandConnect = exec(`connect_runner ${filePath} ~/.ssh/gitlab-runner-shared-id-rsa.pub ${entity.ssh_username}@${entity.ssh_host}`);
    commandConnect.stdout.on('data', async function(data){
      if(data !== ''){
        const consoleItem = await strapi.services.console.create({
          message: data,
          type: 'message',
          project: PROJECT_ID
        });

        //Set status project
        await strapi.services.project.update({
          id: PROJECT_ID
        }, {
          project_status: 'progress'
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${PROJECT_ID}/message`,
          data: consoleItem.message
        });
      }
    });
    commandConnect.stderr.on('data', async function(data){
      if(data !== ''){
        const consoleItem = await strapi.services.console.create({
          message: data,
          type: 'error',
          project: PROJECT_ID
        });

        //Set status project
        await strapi.services.project.update({
          id: PROJECT_ID
        }, {
          project_status: 'failed'
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${PROJECT_ID}/error`,
          data: consoleItem.message
        });
      }
    });
    commandConnect.on('close', async function(code){
      const consoleItem = await strapi.services.console.create({
        message: `Child process exited with code ${code}`,
        type: 'end',
        project: PROJECT_ID
      });
      //Send message
      strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${PROJECT_ID}/end`,
        data: consoleItem.message
      });

      if(code !== 0) {
        const consoleItem = await strapi.services.console.create({
          message: `Setup failed`,
          type: 'build_error',
          project: PROJECT_ID
        });

        //Set status project
        await strapi.services.project.update({
          id: PROJECT_ID
        }, {
          project_status: 'failed'
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${PROJECT_ID}/build_error`,
          data: consoleItem.message
        });
      }else{
        const consoleItem = await strapi.services.console.create({
          message: `Server was connected to runner successfully!`,
          type: 'build_success',
          project: PROJECT_ID
        });
        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${PROJECT_ID}/build_success`,
          data: consoleItem.message
        });

        //Start main program
        const commandExec = exec(command);
        commandExec.stdout.on('data', async function(data){
          if(data !== ''){
            const consoleItem = await strapi.services.console.create({
              message: data,
              type: 'message',
              project: PROJECT_ID
            });

            //Set status project
            await strapi.services.project.update({
              id: PROJECT_ID
            }, {
              project_status: 'progress'
            });

            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${PROJECT_ID}/message`,
              data: consoleItem.message
            });
          }
        });
        commandExec.stderr.on('data', async function(data){
          if(data !== ''){
            const consoleItem = await strapi.services.console.create({
              message: data,
              type: 'error',
              project: PROJECT_ID
            });

            //Set status project
            await strapi.services.project.update({
              id: PROJECT_ID
            }, {
              project_status: 'failed'
            });

            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${PROJECT_ID}/error`,
              data: consoleItem.message
            });
          }
        });
        commandExec.on('close', async (code) => {
          const consoleItem = await strapi.services.console.create({
            message: `Child process exited with code ${code}`,
            type: 'end',
            project: PROJECT_ID
          });
          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${PROJECT_ID}/end`,
            data: consoleItem.message
          });

          if(code !== 0){
            await strapi.services.console.create({
              message: `Setup failed`,
              type: 'build_error',
              project: PROJECT_ID
            });

            //Set status project
            await strapi.services.project.update({
              id: PROJECT_ID
            }, {
              project_status: 'failed'
            });

            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${PROJECT_ID}/build_error`,
              data: `Setup failed`
            });
          }else{
            const consoleItem = await strapi.services.console.create({
              message: `Setup success!`,
              type: 'build_success',
              project: PROJECT_ID
            });

            //Set status project
            await strapi.services.project.update({
              id: PROJECT_ID
            }, {
              project_status: 'success'
            });

            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${PROJECT_ID}/build_success`,
              data: consoleItem.message
            });
          }
        });
      }
    });

    return {ok: true};
  }
};
