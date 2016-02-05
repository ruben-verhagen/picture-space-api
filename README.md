## picture-space
A Node.js backend for picture uploads, shares and votes.

## Technical Specs:
Language: 		node.js

Operating System:	Ubuntu 14.04


## Prerequisites

### Install node.js and NPM (node package manager)
Ubuntu 14.04 contains a version of Node.js in its default repositories that can be used to easily provide a consistent experience across multiple servers. The version in the repositories is 0.10.25. This will not be the latest version, but it should be quite stable.
In order to get this version, we just have to use the apt package manager. We should refresh our local package index prior and then install from the repositories:
> sudo apt-get update

> sudo apt-get install nodejs

If the package in the repositories suits your needs, this is all that you need to do to get set up with Node.js. In most cases, you'll also want to also install npm, which is the Node.js package manager. You can do this by typing:
> sudo apt-get install npm

This will allow you to easily install modules and packages to use with Node.js.
Because of a conflict with another package, the executable from the Ubuntu repositories is called nodejs instead of node. Keep this in mind as you are running software.

To run nodejs as node daemon, you should create a symlink by typing
> sudo ln -s /usr/bin/nodejs /usr/bin/node


### Install mongodb
#### Import the public key used by the package management system.
The Ubuntu package management tools (i.e. dpkg and apt) ensure package consistency and authenticity by requiring that distributors sign packages with GPG keys. Issue the following command to import the MongoDB public GPG Key:
> sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10

#### Create a list of file for MongoDB
Create the /etc/apt/sources.list.d/mongodb.list list file using the following command:
> echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list

#### Reload the local package database
Issue the following command to reload the local package database:
> sudo apt-get update

#### Install the MongoDB packages
You can install the latest stable version of MongoDB by issuing the following command.
> sudo apt-get install -y mongodb-org

#### Run the monogodb
You can run/stop/restart mongodb with the following commands.

> sudo service mongod start

> sudo service mongod stop

> sudo service mongod restart

Verify that the mongod process has started successfully by checking the contents of the log file at /var/log/mongodb/mongod.log for a line reading.
[initandlisten] waiting for connections on port <port>
where <port> is the port configured in /etc/mongod.conf, 27017 by default.

## Run the project

#### Copy the project files
You can git clone the project from github repository or upload the files via FTP to the server.
> git clone https://github.com/ruben-verhagen/ruby-whois-batch.git

> cd picture-space/

#### Install dependencies
You can simply install required packages with the following command in the project directory
> npm install

This line will read package.json and deploy all packages specified.

#### Run the backend app.
The following command will run the backend.
> node app

#### Use forever to save your day.
Next, lets make it persistent using Forever, so once we logoff it still runs and will restart even if node throws an error.
> sudo npm install forever --global

To run your backend forever, go to the project directory and issue the command.
> forever start app.js

You can stop or restart the app with stop/restart commands.
> forever stop app.js

> forever list # to list forever apps currently running.


<strong>Now you are all set, just have fun !</strong>
