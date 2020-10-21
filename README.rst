Indeema tambo: Your personal online DevOps
########################################

This solution was created for web developers and DevOps to automize and speedup server setup process


Main features
=============

* Setup server environment from scratch
* Setup multiple web projects on server
* Create own setup scripts
* Support GitLab CI templates
* Scripts market
* Self-hosted solution
* Linux, macOS and Windows support
* Plugins
* Documentation


Installation
============


Ubuntu 18+
-----


We recommended to install into Ubuntu 18.04 or higher:

.. code-block:: bash

    $ curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -

    $ sudo apt-get update && sudo apt-get install nodejs

    $ npm install pm2 -g

    $ git clone git://github.com/IndeemaSoftware/indeema-ci.git

    $ cd /path/to/indeema-ci/

    $ npm install

    $ npm run build


MacOS Mojave 10.14.6
-----


On macOS, HTTPie can be installed via `PORT <https://www.macports.org/>`_

.. code-block:: bash

    $ port install nodejs

    $ npm install pm2 -g

    $ git clone git://github.com/IndeemaSoftware/indeema-ci.git

    $ cd /path/to/indeema-ci/

    $ npm install

    $ npm run build
    

Fedora 31+
-----


.. code-block:: bash

    $ sudo dnf -y update

    $ curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -

    $ sudo dnf install -y gcc-c++ make

    $ sudo dnf install -y nodejs

    $ npm install pm2 -g

    $ git clone git://github.com/IndeemaSoftware/indeema-ci.git

    $ cd /path/to/indeema-ci/

    $ npm install

    $ npm run build
    
    

Launch
============


.. code-block:: bash

    $ pm2 start --name indeema-ci-api npm -- start
    
    

Admin panel URL
===========

After installing and launch, you able to sign in into admin panel:

.. code-block:: bash

    http://localhost:1338/admin
    

Project structure
==============

By default, Indeema tambo usign Strapi.io framework, so project structure is similar to this framework:

=================   =====================================================
``api``             Contains main logic of back-end part
``build``           Contains React.JS build of admin panel
``config``          Contains configuration of back-end environment
``extensions``      Contains extends of main parts of back-end logic
``public``          Contains public assets and home page
=================   =====================================================
    

User support
------------

Please use the following support channels:

* `GitHub issues <https://github.com/IndeemaSoftware/indeema-ci/issues>`_
  for bug reports and feature requests.
* `Indeema tambo <https://tambo.indeema.com>`_
  to ask questions, discuss features, and for general discussion.
* `StackOverflow <https://stackoverflow.com>`_
  to ask questions (please make sure to use the
  `indeema-ci <https://stackoverflow.com/questions/tagged/indeema-ci>`_ tag).
* You can also send email directly to `<mailto:support@indeema.com>`_.


Authors
------------

See `AUTHORS.rst <https://github.com/IndeemaSoftware/indeema-ci/blob/master/AUTHORS.rst>`_.


Change log
----------

See `CHANGELOG <https://github.com/IndeemaSoftware/indeema-ci/blob/master/CHANGELOG.rst>`_.


Licence
-------

LGPL: `LICENSE <https://github.com/IndeemaSoftware/indeema-ci/blob/master/LICENSE>`_.


Powered by Indeema Software
-------

`Indeema Software Inc <https://indeema.com>`_
    
