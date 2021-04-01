#!/bin/bash

CUR=$(dirname $0)
source $CUR/SECRETS
export RB_DB=$CUR/db/rb.sqlite


# $(which node) returns the path to the current node version
# either the one specified as `default` alias in NVM or a specific version set above
# executing `nvm use 4 1> /dev/null` here won't work!
$(which node) $CUR/run.js $1
