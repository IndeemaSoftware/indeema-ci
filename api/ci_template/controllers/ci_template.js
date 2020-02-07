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
async getTemplate(ctx){
    const entity = ctx.params;
    const path = require('path');
    const filePath = path.resolve() +  `/scripts/ci_templates/${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        rs({"status":"ok", "data": data.toString()});
      });
    });
},

async getListOfTemplates(ctx) {
  const path = require('path');
  const directoryPath =  path.resolve() + '/scripts/ci_templates/';
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) {
        rs(console.log({"status":"bad", "data": err}));
      } 
      rs({"status":"ok", "data":files});
    });
  });
}

};