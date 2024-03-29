FROM ubuntu:latest
ENV TZ="EST"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
SHELL ["/bin/bash", "-c"]

# Set the default UID/GID, these will be overwritten to match
# the calling users ids in the top level run script to allow for
# consistent permissions between the host and Docker filesystems
ARG UID=1000
ARG GID=1000


# Update the system + sudo and create the group/user accordingly
RUN apt-get update -y && apt-get upgrade -y && apt-get install sudo curl -y
RUN groupadd -g ${GID} eugene && \
  useradd --create-home --no-log-init \
  --uid ${UID} \
  --gid ${GID} \
  --groups sudo \
  --shell /bin/bash \
  --home-dir /home/eugene \
  eugene

# Add sudo group to the sudoers file
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers


# Install required tools (nodejs, sqlite, etc)
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
RUN apt-get install git nodejs build-essential -y


USER eugene
WORKDIR /home/eugene
RUN mkdir /home/eugene/rickybobby

COPY ./src /home/eugene/rickybobby/src
COPY ./run.js /home/eugene/rickybobby/
COPY ./package.json /home/eugene/rickybobby/
COPY ./package-lock.json /home/eugene/rickybobby/

RUN (cd /home/eugene/rickybobby && npm install)
