#!/bin/bash

CURRENT_DIRECTORY=$(realpath $(dirname $0))

case $1 in
  build)
    docker build \
      -t rickybobby . \
      --network=host \
      --build-arg UID=$(id -u ${USER}) \
      --build-arg GID=$(id -g ${USER})
    ;;


  sync)
    cp $CURRENT_DIRECTORY/db/rb.sqlite $CURRENT_DIRECTORY/db/backups/$(date %Y-%m-%d).sqlite
    docker run \
      -v $CURRENT_DIRECTORY/db:/home/eugene/rickybobby/db \
      rickybobby /home/eugene/rickybobby/run.js sync
    ;;


  web)
    docker ps -aq --filter 'name=rickybobby-rest-api' | \
      grep -q . && \
      docker stop rickybobby-rest-api && \
      docker rm -fv rickybobby-rest-api

    docker run -t \
      --name rickybobby-rest-api \
      -p 3002:3001 \
      rickybobby /home/eugene/rickybobby/run.js web
    ;;


  shell)
    docker run -it \
      -p 3001:3001 \
      rickybobby /bin/bash

    ;;


  *)
    echo "Unknown operation $1"

esac
