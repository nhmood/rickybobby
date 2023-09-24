#!/bin/bash

# TODO: look into sourcing port from rickybobby.yml

CURRENT_DIRECTORY=$(realpath $(dirname $0))

case $1 in
  build)
    docker build \
      -t rickybobby . \
      --network=host \
      --build-arg UID=$(id -u ${USER}) \
      --build-arg GID=$(id -g ${USER})
    ;;


  # TODO: look into litestream for s3 backup
  sync)
    docker run \
      -v $CURRENT_DIRECTORY/db:/home/eugene/rickybobby/db \
      rickybobby /home/eugene/rickybobby/run.js sync
    ;;


  web)
    docker ps -aq --filter 'name=rickybobby-rest-api' | \
      grep -q . && \
      docker stop rickybobby-rest-api && \
      docker rm -fv rickybobby-rest-api

    docker run -t -d \
      --name rickybobby-rest-api \
      -p 3002:3001 \
      -v $CURRENT_DIRECTORY/db:/home/eugene/rickybobby/db \
      -v $CURRENT_DIRECTORY/rickybobby.yml:/home/eugene/rickybobby/rickybobby.yml \
      rickybobby /home/eugene/rickybobby/run.js web
    ;;


  shell)
    docker run -it \
      -p 3002:3001 \
      -v $CURRENT_DIRECTORY/db:/home/eugene/rickybobby/db \
      -v $CURRENT_DIRECTORY/rickybobby.yml:/home/eugene/rickybobby/rickybobby.yml \
      rickybobby /bin/bash

    ;;


  *)
    echo "Unknown operation $1"

esac
