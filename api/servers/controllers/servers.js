'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

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
async getServer(ctx) {
    const entity = ctx.params;
    const path = require('path');
    const directoryPath = path.resolve() +  `/scripts/servers/${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(directoryPath, (err, data) => {
        if (err) rs({"status":"bad", "data":err});

        rs({"status":"ok", "data": data.toString()});
      });
    });
},

async writeServer(ctx) {
  console.log(ctx.request.body);
  const entity = ctx.params;
  const path = require('path');
  const directoryPath = path.resolve() +  `/scripts/servers/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async deleteServer(ctx) {
  const entity = ctx.params;
  const path = require('path');
  const directoryPath = path.resolve() +  `/scripts/servers/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async getListOfServers(ctx) {
  const path = require('path');
  const directoryPath =  path.resolve() + '/scripts/servers/';
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) rs(console.log({"status":"bad", "data": err}));
      
      rs({"status":"ok", "data":files});
    });
  });
}

};