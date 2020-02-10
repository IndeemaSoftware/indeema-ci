'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const resourcesPath = path.resolve() + "/public/uploads/" 

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
async getScript(ctx) {
    const entity = ctx.params;
    const directoryPath = resourcesPath + `scripts/ci_scripts/${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(directoryPath, (err, data) => {
        if (err) rs({"status":"bad", "data":err});

        rs({"status":"ok", "data": data.toString()});
      });
    });
},

  /**
   * Get ci template 
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  async getTemplate(ctx) {
    const entity = ctx.params;
    const directoryPath = resourcesPath + `ci_templates/${entity.ci}/${entity.name}`;

    return new Promise((rs, rj) => {
      fs.readFile(directoryPath, (err, data) => {
        if (err) rs({"status":"bad", "data":err});

        rs({"status":"ok", "data": data.toString()});
      });
    });
},

async writeScript(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `scripts/ci_scripts/${entity.name}`;

  if (!fs.existsSync(resourcesPath + `ci_templates/${entity.name}`)){
    fs.mkdirSync(resourcesPath + `ci_templates/${entity.name}`);
  }
  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async writeTemplate(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `ci_templates/${entity.ci}/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.writeFile(directoryPath, ctx.request.body.data, (err) => {
      if (err) rs({"status":"ok", "data":err});

      rs({"status":"ok", "data":entity.name});
    }); 
  }); 
},

async deleteScript(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `scripts/ci_scripts/${entity.name}`;

  deleteFolderRecursive(resourcesPath + `ci_templates/${entity.name}`);

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async deleteTemplate(ctx) {
  const entity = ctx.params;
  const directoryPath = resourcesPath + `ci_templates/${entity.ci}/${entity.name}`;

  return new Promise((rs, rj) => {
    fs.unlink(directoryPath, (err) => {
      if (err) rs({"status":"bad", "data":err});

      rs({"status":"ok", "data":"The file was succesfully saved!"});
    });
  });
},

async getListOfScripts(ctx) {
  const directoryPath =  resourcesPath + 'scripts/ci_scripts/';
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) rs(console.log({"status":"bad", "data": err}));
      
      rs({"status":"ok", "data":files});
    });
  });
},

async getListOfTemplates(ctx) {
  const entity = ctx.params;
  const directoryPath =  resourcesPath + `ci_templates/${entity.script}`;
  
  return new Promise((rs, rj) => {
    fs.readdir(directoryPath, function (err, files) {
      files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      if (err) rs(console.log({"status":"bad", "data": err}));
      
      rs({"status":"ok", "data":files});
    });
  });
}

};

var deleteFolderRecursive = function(path) {
  console.log("Deleting");
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};