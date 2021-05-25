/*
Workout Competitive Update

Update all workouts to be competitive=1 as default
If a workout corresponds to a non-competitive ride (cool down/warm up)
then remove the (set to 0) the competitive flag
*/


UPDATE
  rides
SET
  competitive = 1
;


UPDATE
  rides
SET
  competitive = 0
WHERE
  lower(title) LIKE "%cool down%" OR
  lower(title) LIKE "%warm up%"
;


UPDATE
  workouts
SET
  competitive = 1
;

UPDATE
  workouts
SET
  competitive = 0
WHERE
 ride_id IN (
  SELECT
    id
  FROM
    rides
  WHERE
    competitive = 0
  )
;
