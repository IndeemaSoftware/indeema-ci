'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const path = require('path');
const resourcesPath = path.resolve() + "/public/uploads/" 


module.exports = {
    getScript: async (app) => {
        return new Promise((rs, rj) => {
            const directoryPath = resourcesPath + `scripts/ci_scripts/${entity.name}`;

            fs.readFile(directoryPath, (err, data) => {
              if (err) rs({"status":"bad", "data":err});
      
              rs({"status":"ok", "data": data.toString()});
            });
          });
      },
};