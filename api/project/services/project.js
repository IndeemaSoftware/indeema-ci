'use strict';

const fs = require('fs');

//Exec for shell command`s
const exec = require('child_process').exec;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

const awsDefaultRegions = [
  {
    "continentCode": "NA",
    "description": "This region is recommended to serve users in the eastern United States",
    "displayName": "Virginia",
    "name": "us-east-1",
    "availabilityZones": []
  },
  {
    "continentCode": "NA",
    "description": "This region is recommended to serve users in the eastern United States",
    "displayName": "Ohio",
    "name": "us-east-2",
    "availabilityZones": []
  },
  {
    "continentCode": "NA",
    "description": "This region is recommended to serve users in the northwestern United States, Alaska, and western Canada",
    "displayName": "Oregon",
    "name": "us-west-2",
    "availabilityZones": []
  },
  {
    "continentCode": "EU",
    "description": "This region is recommended to serve users in Ireland, the United Kingdom, and Iceland",
    "displayName": "Ireland",
    "name": "eu-west-1",
    "availabilityZones": []
  },
  {
    "continentCode": "EU",
    "description": "This region is recommended to serve users in Ireland, the United Kingdom, and Iceland",
    "displayName": "London",
    "name": "eu-west-2",
    "availabilityZones": []
  },
  {
    "continentCode": "EU",
    "description": "This region is recommended to serve users in France and central Europe",
    "displayName": "Paris",
    "name": "eu-west-3",
    "availabilityZones": []
  },
  {
    "continentCode": "EU",
    "description": "This region is recommended to serve users in Europe, the Middle East, and Africa",
    "displayName": "Frankfurt",
    "name": "eu-central-1",
    "availabilityZones": []
  },
  {
    "continentCode": "AP",
    "description": "This region is recommended to serve users in India and Southeast Asia",
    "displayName": "Singapore",
    "name": "ap-southeast-1",
    "availabilityZones": []
  },
  {
    "continentCode": "AP",
    "description": "This region is recommended to serve users in Austalia, New Zealand, and the South Pacific",
    "displayName": "Sydney",
    "name": "ap-southeast-2",
    "availabilityZones": []
  },
  {
    "continentCode": "AP",
    "description": "This region is recommended to serve users in Japan",
    "displayName": "Tokyo",
    "name": "ap-northeast-1",
    "availabilityZones": []
  },
  {
    "continentCode": "AP",
    "description": "This region is recommended to serve users in South Korea",
    "displayName": "Seoul",
    "name": "ap-northeast-2",
    "availabilityZones": []
  },
  {
    "continentCode": "AP",
    "description": "This region is recommended to serve users in India and southern Asia",
    "displayName": "Mumbai",
    "name": "ap-south-1",
    "availabilityZones": []
  },
  {
    "continentCode": "NA",
    "description": "This region is recommended to serve users in eastern and central Canada",
    "displayName": "Montreal",
    "name": "ca-central-1",
    "availabilityZones": []
  }
];

module.exports = {

  /**
   * Return AWS regions list
   * @returns {Promise<void>}
   */
  awsRegionsList: async () =>{
    return new Promise((rs, rj) => {
      const commandExec = exec('aws lightsail get-regions');
      commandExec.stdout.on('data', async function(data){
        try{
          data = JSON.parse(data);
        }catch(e){
          rs(awsDefaultRegions);
        }

        if(!data.regions) {
          rs(awsDefaultRegions);
          return;
        }

        rs(data.regions);
      });
      commandExec.stderr.on('data', async function(data){
        rs(awsDefaultRegions);
      });
      commandExec.on('close', async (code) => {
        //Not needed this
      });
    });
  },

  /**
   * Make cleanup app of project
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  cleanupApp: async (project, app) => {
    const APP_ID = app._id.toString();

    //Remove console output
    const output = await strapi.services.console.find({
      app: APP_ID
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    var command = '';

    if(app.os === 'aws_s3'){
      command = `~/scripts/cleanup_s3 -s ${app.s3_bucket_name} -k ${app.aws_secret_access_key} -i ${app.aws_access_key_id}`;
      if(app.s3_region)
        command += ` -r ${entity.s3_region}`;

    }else{

      //Setup command
      command = '~/scripts/cleanup_server ';

      //Get path of file
      const path = require('path');
      const filePath = path.resolve() + '/public' + app.ssh_pem.url;

      //Setup pem chmod
      fs.chmodSync(filePath, 400);

      //Add project details
      command += '-n "' + project.project_name + '" ';
      command += '-a "' + app.app_name + '" ';
      command += '-u ' + app.ssh_username + ' ';
      command += '-d ' + app.ssh_host + ' ';
      command += '-s ' + filePath + ' ';

      if(app.domain_name)
        command += '-b ' + app.domain_name + ' ';
      else
        command += '-b ' + app.ssh_host + ' ';


    }

    //Start cleanup program
    return new Promise((rs, rj) => {

      const commandExec = exec(command);
      commandExec.stdout.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'message',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'cleanup'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/message`,
            data: consoleItem.message
          });
        }
      });
      commandExec.stderr.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'cleanup_failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/error`,
            data: consoleItem.message
          });
        }
      });
      commandExec.on('close', async (code) => {
        const consoleItem = await strapi.services.console.create({
          message: `Child process exited with code ${code}`,
          type: 'end',
          app: APP_ID
        });
        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${APP_ID}/end`,
          data: consoleItem.message
        });

        if(code !== 0){
          await strapi.services.console.create({
            message: `Cleanup failed`,
            type: 'build_error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'cleanup_failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/build_error`,
            data: `Cleanup failed failed`
          });

          rs(false);
        }else{
          const consoleItem = await strapi.services.console.create({
            message: `Cleanup success!`,
            type: 'build_success',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'cleanup_success'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/build_success`,
            data: consoleItem.message
          });

          rs(true);
        }
      });

    });
  }
};
