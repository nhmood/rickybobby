function printHelp(){
  console.log(`
  rickybobby cli

  run.js [OPERATION] [ARGs]
  run.js migrate [MIGRATION_FILE]
    run specified migration against sqlite database

  run.js authenticate
    authenticate given a username and password to retrieve an access token for the API
    NOTE - RB_PTON_USER and RB_PTON_PASS environment variables should be set

  run.js test
    test to load up rickybobby environment and make sure configuration is correct


  run.js fetch [RESOURCE] [OPTIONS]
    fetch operations perform the full API -> DB flow for a given resource
    the PelotonAPI will be hit to retrieve the specified resource, a DataLog
    will be created with the raw payload data, and the corresponding ResourceModel
    will be created and populated according to the import rules

    user: fetch user resource by id or username
      RB_DB=./db/rb.sqlite ./run.js fetch user nhmood


    following: fetch following users (users that specified user is following) by user username
      RB_DB=./db/rb.sqlite ./run.js fetch following nhmood


    ride: fetch ride resource by id
      RB_DB=./db/rb.sqlite ./run.js fetch ride 750381e633584526ae95b2222b52cae1


    instructor: fetch instructor by id
      RB_DB=./db/rb.sqlite ./run.js fetch instructor 05735e106f0747d2a112d32678be8afd


    workout: fetch workout by id
      RB_DB=./db/rb.sqlite ./run.js fetch workout fe56f71ee3a0442fa5c1e5ff5acaa530


    workouts: fetch workouts for specified user
      RB_DB=./db/rb.sqlite ./run.js fetch workouts [FORCE] [START PAGE]
      force - fetch workouts will bail old entries are found (implies we are up to date)
              the force parameter will override this behavior and walk through ALL pages
      start page - specify which page of workouts to start from for a user (useful for debugging)


      RB_DB=./db/rb.sqlite ./run.js fetch workouts [FORCE] [START PAGE]
      RB_DB=./db/rb.sqlite ./run.js fetch workouts nhmood
        fetch all workouts for user, bail if duplicates are found (workouts are up to date)

      RB_DB=./db/rb.sqlite ./run.js fetch workouts nhmood true
        fetch all workouts for user, walk through all pages even if old entries are found

      RB_DB=./db/rb.sqlite ./run.js fetch workouts nhmood false 10
        fetch workouts for user, start from page 10


    run.js rebuild
      rebuild the entire database models from the raw DataLog records
      this is useful if you make changes to imports/schema/structure and want to rebuild
      the Model records without pulling all the API data again


    run.js search [USERNAME]
      search local database for user by username

    run.js remove [USER]
      remove all records associated to user from database (includes DataLog)


    run.js sync
      walk through all users that are being tracked and sync their state against the latest API data


    run.js get [RESOURCE] [RESOURCE_ID]
      get specified resource from DB
      resources include: [user(id), user(username), workout, ride, datalog]

      RB_DB=./db/rb.sqlite ./run.js get username nhmood


    run.js common [USERA] [USERB]
      get common workouts between two specified users

      RB_DB=./db/rb.sqlite ./run.js common nhmood pmlynn8390


    run.js web
      start rickybobby webserver
  `);
}


module.exports = printHelp;
