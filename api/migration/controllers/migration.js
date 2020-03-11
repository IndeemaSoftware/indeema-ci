'use strict';

const fs = require('fs');

function msleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
  }

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async export(ctx) {
        const user = ctx.state.user;

        strapi.services.migration.prepareFolders(user._id.toString());
        strapi.services.migration.prepareCiTemplates(ctx);
        strapi.services.migration.prepareCustomDependencies(ctx);
        strapi.services.migration.prepareMaintenance(ctx);
        strapi.services.migration.preparePlatform(ctx);
        strapi.services.migration.prepareServerDependencies(ctx);
        strapi.services.migration.prepareService(ctx);
        strapi.services.migration.compressAllFiles(ctx);

            //Get path of file
        const path = require('path');
        const filePath = path.resolve() + `/public/uploads/${user._id.toString()}.ici`;

        if (!fs.existsSync(filePath))
            return ctx.notFound();

        return {status:true};
    },

    async download(ctx) {
        const path = require('path');
        const filePath = path.resolve() + `/public/uploads/${ctx.params.id}.ici`;
        if(!fs.existsSync(filePath))
          return ctx.notFound();
    
        ctx.body = fs.createReadStream(filePath);
        ctx.attachment(filePath);
    },

    async import(ctx) {
        const user = ctx.state.user;
        await strapi.services.migration.prepareFolders(ctx.params.id);

        await strapi.services.migration.decompressAllFiles(ctx.params.id);
        await strapi.services.migration.importCiTemplates(ctx, ctx.params.id);
        await strapi.services.migration.importCustomDependencies(ctx, ctx.params.id);
        await strapi.services.migration.importMaintenance(ctx, ctx.params.id);
        await strapi.services.migration.importPlatform(ctx, ctx.params.id);
        await strapi.services.migration.importServerDependencies(ctx, ctx.params.id);
        await strapi.services.migration.importService(ctx, ctx.params.id);

        return {status:true};
    }
};
