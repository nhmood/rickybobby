const Model = require("./model.js");
class Following extends Model {
  static tableName = "following";


  // Helper to create a proper User record given
  // the data from the raw Peloton User API response
  static import(data){
    let following = this.upsert({
      id: 					data.id,
      user_id: 			data.user_id,
      following_id: data.following_id
    });

    return following;
  }


  static fromUser(userID){
    let count = this.count({user_id: userID});

    let sql = `
      SELECT
        user.id,
        user.username,
        user.image_url
      FROM
        following as follow
      INNER JOIN
        users as user
      ON
        follow.following_id = user.id
      WHERE
        follow.user_id = ?;
    `;

    const stmt = this.db.prepare(sql);
    const records = stmt.all(userID);

    return {
      users: records,
      count: count
    }
  }
}

module.exports = Following;
