#!/bin/sh
PATH=$PATH:/volume1/@appstore/Node.js_v8/usr/local/lib/node_modules/forever/bin
start() {
    forever start --workingDir /volume1/server/web2epub --sourceDir /volume1/server/web2epub -l /volume1/server/web2epub/logs/log.txt -o /volume1/server/web2epub/logs/output.txt .
}
stop() {
        killall -9 node
}
case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  *)
    echo "Usage: $0 {start|stop}"
