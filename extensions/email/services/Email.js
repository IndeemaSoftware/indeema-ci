'use strict';

/**
 * Email.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const nodemailer = require('nodemailer');


module.exports = {
  async send(options, config, cb) {
    const configTransport = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: strapi.config.INDEEMA_MAILING_USER,
        pass: strapi.config.INDEEMA_MAILING_PWD
      }
    };

    // Create reusable transporter object using SMTP transport.
    const transporter = nodemailer.createTransport(configTransport);

    const emailArgs = _.assign(options, {
      from: `Indeema Mailing <${strapi.config.INDEEMA_MAILING_USER}>`
    });

    // Return a promise of the function that sends the email.
    return transporter.sendMail(emailArgs);
  },
};
