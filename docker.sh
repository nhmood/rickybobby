#!/bin/bash


case $1 in
  build)
    docker build \
      -t rickybobby . \
      --build-arg UID=$(id -u ${USER}) \
      --build-arg GID=$(id -g ${user})
    ;;


  sync)
    docker run -it \
      -v $(pwd):/home/eugene/rickybobby \
      rickybobby /home/eugene/rickybobby/run.sh sync
    ;;


  web)
    docker run -t \
      -p 3001:3000 \
      rickybobby /home/eugene/rickybobby/run.sh web
    ;;


  shell)
    docker run -it \
      -v $(pwd):/home/eugene \
      rickybobby /bin/bash

    ;;


  *)
    echo "Unknown operation"

esac
