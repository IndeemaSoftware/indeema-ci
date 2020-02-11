'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const resourcesPath = path.resolve() + "/public/uploads/scripts/" 

/**
 * default bookshelf controller
 *
 */
module.exports = {
  /**
   * Get ci template 
   *
   * @param ctx
   * @returns {Promise<void>}
   */
async getPlatform(ctx) {
    const entity = ctx.params;
    const directoryPath = resourcesPath +  `platforms/${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(directoryPath, (err, data) => {
        if (err) rs({"status":"bad", "data":err});

        rs({"status":"ok", "data": data.toString()});
      });
    });
},

async getPlatformCleanup(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_cleanup/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.readFile(directoryPath, (err, data) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data": data.toString()});
    });
  });
},

async getPlatformFirewall(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_firewall/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.readFile(directoryPath, (err, data) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data": data.toString()});
    });
  });
},

async writePlatform(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async writePlatformCleanup(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_cleanup/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async writePlatformFirewall(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_firewall/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async deletePlatform(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async deletePlatformCleanup(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_cleanup/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async deletePlatformFirewall(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `platforms_firewall/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async getListOfPlatforms(ctx) {
  const user = ctx.state.user;
  const query = ctx.query;

  //For non admin roles
  if(user.role.type !== 'administrator')
    query.user = user._id.toString();

  let entities;
  if (query._q) {
    entities = await strapi.services.platform.search(query);
  } else {
    entities = await strapi.services.platform.find(query);
  }

  return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.platform }));
},

async getListOfPlatformsCleanup(ctx) {
  const directoryPath =  resourcesPath + 'platforms_cleanup/';
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) rs(console.log({"status":"bad", "data": err}));
      
      rs({"status":"ok", "data":files});
    });
  });
}

};