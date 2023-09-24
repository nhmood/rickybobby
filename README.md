# rickybobby

rickybobby is a webapp that lets you compete head to head on [Peloton](https://onepeloton.com) rides. The app consists of a [scraper](https://github.com/nhmood/rickybobby/blob/main/src/core.js) that pulls data from the [(unofficial) Peloton API](https://github.com/nhmood/rickybobby/blob/main/src/peloton/core.js) into a local [SQLite database](https://github.com/nhmood/rickybobby/tree/main/src/db), and a [web frontend](https://github.com/nhmood/rickybobby/tree/main/src/web) that sources the data for head to head comparisons, history, and user profiles.

  
The project came about as a way to systematically one up a friend on Peloton rides and ended up as a dive into NodeJS,  the [Baked Data Architecture](https://simonwillison.net/2021/Jul/28/baked-data/), and writing a mini/lite ORM for SQLite.
  

  

# Installation / Usage
rickybobby requires `nginx` and `docker`
  ```
  # clone the repo
  git clone https://github.com/nhmood/rickybobby.git
  cd rickybobby
  
# build the docker image
  ./docker.sh build

# update the rickybobby.yml with peloton credentials
# NOTE: recommended that you create a separate peloton account in case
#       peloton doesn't take too kindly to the API usage
vim rickybobby.yml

# run the web interface
./docker.sh web

# configure nginx
ln -s $PWD/infra/nginx/rickybobby.conf /etc/nginx/sites-available
ln -s /etc/nginx/sites-available/rickybobby.conf /etc/nginx/sites-enabled
sudo nginx -t # check config
sudo service nginx restart
sudo service nginx status

# add sync to crontab
crontab -l >> cronupdate
cat cron.example >> cronupdate
crontab cronupdate
rm cronupdate
  ```
