/*
Early Workout Fetch Cleanup

If a fetch occurs while a workout is in progress, the data will be imported incorrectly
This query finds workouts that were imported while still in progress and inserts
them into the Rebuild table for cleanup.
A workout is defined as "in progress" if the taken_at + workout duration is GREATER
than the created_at time of the record
*/

INSERT INTO
  rebuilds (
    created_at,
    updated_at,
    complete,
    fetch,
    target,
    target_id
  )

  SELECT
    CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER), -- goofy date->epoch in ms
    CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER), -- goofy date->epoch in ms
    0,          -- complete is false
    1,          -- fetch (from API) is true
    "workout",  -- workout record
    id          -- pull ID from workouts that match criteria
  FROM
    workouts
  WHERE
    created_at < ((taken_at + duration) * 1000); -- 1000 for conversion of second epoch (taken_at) to ms
