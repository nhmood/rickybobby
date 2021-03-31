// TODO - add support for autoincrementing PK
// TODO - update static db methods to return model instance
class Model {
  static db;
  static rawSchema;
  static schema = {};
  static jsonFields = [];

  // Model setup to configure underlying Database instance
  // and table schema information
  static setup(db){
    // Store the parent Database instance that has the
    // underlying SQLite3 handle
    this.db = db;

    // Read the table schema from SQLite3, parse it into
    // a table description, then store the formatted schema
    // and table primary key into the model class
    this.rawSchema  = this.getRawSchema();
    let tableInfo   = this.parseTable(this.rawSchema);
    this.schema     = tableInfo.schema;
    this.primaryKey = tableInfo.primaryKey;

    return this;
  }


  // SQL query to pull the schema for the specified table
  static getRawSchema(){
    const stmt = this.db.prepare(`PRAGMA table_info(${this.tableName})`);
    const result = stmt.all();
    return result;
  }


  // Parse the raw SQLite3 table info and create
  // a schema container with the column/types along with
  // the table primary key
  static parseTable(rawSchema){
    let schema = {};
    let primaryKey;
    // Walk through all columns of the rawSchema and populate
    // the schema container for the table
    rawSchema.forEach(column => {
      global.logger.debug(`Building ${this.tableName}:${column.name}`);
      schema[column.name] = {
        name: column.name,
        type: column.type,
        pk:   (column.pk == 1)
      };

      // If the pk field is set, set current column as primaryKey
      if (column.pk == 1){ primaryKey = column.name };
    })

    // Return the schema and primary key of the table
    return {schema: schema, primaryKey: primaryKey};
  }


  // Determine whether the table primaryKey is present
  // in the provided dataset
  static getPK(data){
    const pk = data[this.primaryKey];
    if (pk == undefined){
      logger.error(`${this.tableName} PK:${this.primaryKey} not supplied -> ${data}`);
      logger.error({data});
      return false;
    }

    return pk;
  }


  // Retrieve the specified record from the table by id (primaryKey)
  // Returns an instance of the model with data populated by the record/row
  static get(id){
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?;`);
    const result = stmt.get(id);
    if (result == undefined){
      logger.info(`${this.tableName}:${id} not found`);
      return;
    }


    // If the record is found, call the model constructor with the result
    // to create a proper model object
    let model = new this(result);
    return model;
  }


  // Query specified model table with provided conditions
  static where(options){
    options.conditions = options.conditions || {}

    // Set the selector condition based on whether we want to count or retrieve
    // TODO - probably want to add a fields specifier here
    let selector = options.count ? "COUNT(*) as count" : "*";

    // Format the initial SQL WHERE statement with the table and field bindings
    let sql = `SELECT ${selector} FROM ${this.tableName}`;

    // If there are conditions provided for the query, then properly format
    // the field bindings and apply them to the SQL statement
    if (Object.keys(options.conditions).length > 0 ){
      // Grab the fields to be queried by from the conditions and format
      // the named parameters for the SQL statement
      let fields        = Object.keys(options.conditions);
      let fieldBindings = Object.keys(options.conditions).map(f => { return `${f} = @${f}` });

      sql = sql.concat(` WHERE ${fieldBindings.join(" AND ")}`);
    }


    // Format for order by option
    if (options.orderBy){
      // TODO - validate direction against asc/desc and ignore if invalid
      // TODO - validate that the field provided is a member of the model
      let direction = options.orderBy.direction || "desc";
      sql = sql.concat(` ORDER BY ${options.orderBy.field} ${direction}`);
    }


    // If the limit parameter is present and a valid integer, append to the SQL statement
    let limitInt = parseInt(options.limit);
    if (limitInt){
      let pageInt = parseInt(options.page) || 0;
      sql = sql.concat(` LIMIT ${limitInt} OFFSET ${ limitInt * pageInt }`);
    }


    // Perform the SQL query then map the results into proper model instances
    const stmt = this.db.prepare(sql);

    // If we are just counting, no need to format the results
    // into the corresponding model, just return the count
    if (options.count){
      const record = stmt.get(options.conditions);
      return record.count;
    }

    // Get the records and map to the model
    const records = stmt.all(options.conditions);
    const models = records.map(r => { return new this(r) });

    logger.debug({models});
    return models;
  }


  // Count specified model table with provided conditions
  static count(conditions = {}){
    let result = this.where({
      conditions: conditions,
      limit: 0,
      page: 0,
      count: true
    });

    return result;
  }


  // Query the specified model table with provided conditions but
  // return only the first result
  static first(conditions = {}){
    return this.where({
      conditions: conditions,
      limit: 1
    })[0];
  }


  // Create a record of the specified model given the input parameters
  // Handles minor validations as well as created/updated_at timestamp setting
  static create(data){
    logger.debug({data});
    const pk = this.getPK(data);
    if (!pk){ return false; }

    // Add the created/updated_at fields unless already present in the data
    data.created_at = data.created_at || (new Date()).getTime();
    data.updated_at = data.updated_at || (new Date()).getTime();

    // Grab the fields from the data, format the named parameters for the SQL statment,
    // and separate out the associated values
    let fields        = Object.keys(data);
    let fieldBindings = Object.keys(data).map(f => {return `@${f}`});


    // Translate any JSON fields
    fields.forEach(f => {
      //  If the field is a specified JSON field, parse it
      //  and replace the stored value as an object
      if (this.jsonFields.includes( f )){
        data[f] = JSON.stringify(data[f]);
      }
    });
    let values = Object.values(data);


    const stmt = this.db.prepare(`INSERT INTO ${this.tableName} (${fields.join(", ")}) VALUES (${fieldBindings.join(", ")})`);
    const result = stmt.run(data);
    logger.debug(result);

    const record = this.get(pk);
    return record;
  }


  // Update a record of the specified model with the specified data
  // This is a static method of the model that is called from an instance of the record
  static update(data){
    const pk = this.getPK(data);
    if (!pk){ return false; };

    // Add the updated_at field unless already present in teh data
    data.updated_at = data.updated_at || (new Date()).getTime();

    // Grab the fields from the data but remove the primaryKey value (as we are issuing an UPDATE)
    // then format the named parameters for the SQL statement
    let fields = Object.keys(data);
    let pkIndex = fields.indexOf(this.primaryKey);
    fields.splice(pkIndex, 1);
    let fieldBindings = fields.map(f => {return `${f} = @${f}`});

    const stmt = this.db.prepare(`UPDATE ${this.tableName} SET ${fieldBindings.join(", ")} WHERE ${this.primaryKey} = @${this.primaryKey}`);
    const result = stmt.run(data);
    logger.debug(result);

    const record = this.get(pk);
    return record;
  }


  // Update or insert a record of the specified model with the specified data
  // If the record can be found by primaryKey, that entry will be updated, otherwise
  // a new record will be inserted
  static upsert(data){
    const pk = this.getPK(data);
    if (!pk){ return false; }

    let record = this.get(pk);
    if (record == undefined){
      logger.debug(`${this.tableName}:${pk} not found, creating`);
      record = this.create(data);
    } else {
      logger.debug(`${this.tableName}:${pk} found, updating`);
      record.update(data);
    }
    logger.debug({record});

    return record;
  }


  static destroy(id){
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?;`);
    const result = stmt.run(id);
    if (result == undefined){
      logger.error(`${this.tableName}:${id} failed to delete`);
      return false;
    }
    return true;
  }


  // Model record constructor that sets data parameters as object properties
  // and stores model references (self, schema, primaryKey)
  constructor(data){
    // Store model properties so instance can perform validations and DB backed
    // (static) method operations
    this.model      = this.constructor;
    this.schema     = this.model.schema;
    this.primaryKey = this.model.primaryKey;


    let keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++){
      let k = keys[i];
      let value = data[k];

      //  If the field is a specified JSON field, parse it
      //  and replace the stored value as an object
      if (this.model.jsonFields.includes( k )){
        value = JSON.parse(value);
      }

      // Set the field as a property of this object
      this[k] = value;
    }
  }


  // Primary Key getter to retrieve the PK of the instance (based on the primaryKey field)
  get pk(){
    return this[ this.primaryKey ];
  }


  // Update the instance (record) with the specified fields
  // Performs some validation on the presented fields, updates the individual instance,
  // then pushes the updates to the backend db
  update(data){
    const fields = Object.keys(data);
    if (!this.validFields(fields)){ return false; }

    // For the provided fields, update the properties of the instance of model
    fields.forEach(f => {
      logger.debug(`${this.model.name}->updating ${f}:${data[f]}`);

      let value = data[f];

      // If the specified field is a JSON field, perform an object
      // assign to merge the values
      if (this.model.jsonFields.includes( f )){
        value = Object.assign(this[f] || {}, value);
      }

      this[f] = value;
    })

    // Save the model to the backend database
    this.save();

    return true;
  }


  // Write the model representation to the backend database
  save(){
    // Get the "entry", which is the database representation of field=>value
    // that match the schema of the model
    // Then push the entry to the static model update call
    const entry = this.getEntry();
    this.model.update(entry);

    return true;
  }


  destroy(){
    return this.model.destroy(this.id);
  }


  // Field validator that makes sure provided parameters match
  // the fields of the model
  validFields(fields){
    let valid = true;
    fields.forEach(f => {
      if (this.schema[f] == undefined){ valid = false; }
    })

    return valid;
  }


  // Get the database representation of this model instance
  // based on the schema of the table
  getEntry(){
    const fields = Object.keys(this.schema);

    let entry = {};
    fields.forEach(f => {
      let value = this[f];

      // If the specified field is a JSON field, stringify the
      // field before storing the value
      if (this.model.jsonFields.includes(f)){
        value = JSON.stringify(value);
      }

      entry[f] = value;
    });

    return entry;
  }

  json(){
    let data = this.getEntry();
    return JSON.stringify(data, null, 2);
  }
}


module.exports = Model;
