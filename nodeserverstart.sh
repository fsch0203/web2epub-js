#!/bin/sh
PATH=$PATH:/volume1/@appstore/Node.js_v8/usr/local/lib/node_modules/forever/bin

forever start /volume1/server/web2epub/index.js
