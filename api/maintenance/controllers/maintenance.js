'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const resourcesPath = path.resolve() + "/public/uploads/maintenance/" 

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
async getMaintenance(ctx) {
    const entity = ctx.params;
    const directoryPath = resourcesPath + `${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(directoryPath, (err, data) => {
        if (err) rs({"status":"bad", "data":err});

        rs({"status":"ok", "data": data.toString()});
      });
    });
},

async writeMaintenance(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async deleteMaintenance(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async getListOfMaintenance(ctx) {
  const directoryPath =  resourcesPath;
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) rs(console.log({"status":"bad", "data": err}));
      
      rs({"status":"ok", "data":files});
    });
  });
}

};