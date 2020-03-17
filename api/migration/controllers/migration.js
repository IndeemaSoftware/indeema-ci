'use strict';

const fs = require('fs');

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

    async findAll(ctx) {
        const user = ctx.state.user;
        const query = ctx.query;
        
        let entities;
        if (query._q) {
          entities = await strapi.services.migration.search(query);
        } else {
          entities = await strapi.services.migration.find(query);
        }
          
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.migration}));
    },

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
        const filePath = path.resolve() + `/public/uploads/${user._id.toString()}.tar.gz`;

        if (!fs.existsSync(filePath))
            return ctx.notFound();

        return {status:true};
    },

    async download(ctx) {
        const path = require('path');
        const filePath = path.resolve() + `/public/uploads/${ctx.params.id}.tar.gz`;
        if(!fs.existsSync(filePath))
          return ctx.notFound();
    
        ctx.body = fs.createReadStream(filePath);
        ctx.attachment(filePath);
    },

    async import(ctx) {
        const user = ctx.state.user;
        const query = ctx.query;
        var identifier = null;
        
        let entities;
        if (query._q) {
          entities = await strapi.services.migration.search(query);
        } else {
          entities = await strapi.services.migration.find(query);
        }

        for (var m of entities) {
            for (var f of m.module) {
                if (f.hash === ctx.params.id) {
                    identifier = m.identifier;
                }
            }
        }

        if (!identifier) {
            identifier = ctx.params.id;
        }

        user.module.push(identifier);

        await strapi.services.migration.prepareFolders(ctx.params.id);

        await strapi.services.migration.decompressAllFiles(ctx.params.id);
        await strapi.services.migration.importCiTemplates(ctx, ctx.params.id, identifier);
        await strapi.services.migration.importCustomDependencies(ctx, ctx.params.id, identifier);
        await strapi.services.migration.importMaintenance(ctx, ctx.params.id, identifier);
        await strapi.services.migration.importPlatform(ctx, ctx.params.id, identifier);
        await strapi.services.migration.importServerDependencies(ctx, ctx.params.id, identifier);
        await strapi.services.migration.importService(ctx, ctx.params.id, identifier);

        await strapi.query('user', 'users-permissions').update({id: user._id}, {module:user.module});

        return {status:true};
    },

    async uninstall(ctx) {
        const user = ctx.state.user;
        const query = ctx.query;
        var identifier = null;

        let entities;
        if (query._q) {
          entities = await strapi.services.migration.search(query);
        } else {
          entities = await strapi.services.migration.find(query);
        }

        for (var m of entities) {
            for (var f of m.module) {
                if (f.hash === ctx.params.id) {
                    identifier = m.identifier;
                }
            }
        }
        
        var modules = [];
        for (var m of user.module) {
            if (m !== identifier) {
                modules.push(m);
            }
        }

        user.module = modules;

        await strapi.services.migration.uninstallCiTemplates(ctx, ctx.params.id, identifier);
        await strapi.services.migration.uninstallCustomDependencies(ctx, ctx.params.id, identifier);
        await strapi.services.migration.uninstallMaintenance(ctx, ctx.params.id, identifier);
        await strapi.services.migration.uninstallPlatform(ctx, ctx.params.id, identifier);
        await strapi.services.migration.uninstallServerDependencies(ctx, ctx.params.id, identifier);
        await strapi.services.migration.uninstallService(ctx, ctx.params.id, identifier);

        await strapi.query('user', 'users-permissions').update({id: user._id}, {module:user.module});

        return {status:true};
    }
};
