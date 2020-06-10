Indeema CI: Your personal online DevOps
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

    $ pm2 start --name indeema-ci-api npm -- start


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

    $ pm2 start --name indeema-ci-api npm -- start
    

Fedora 31+
-------------


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

    $ pm2 start --name indeema-ci-api npm -- start
    
    
