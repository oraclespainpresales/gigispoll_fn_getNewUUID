const oracledb = require('oracledb')
    , fdk = require('@fnproject/fdk')
    , crypto = require('crypto')
    , moment = require('moment')
;

oracledb.outFormat = oracledb.OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let pool;

function uuidv4() {
  return ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(2).readUInt8() & 15 >> c / 4).toString(16)
  );
}

fdk.handle(async function(input){

  console.log("Function invoked...");

  let result = {};

  if (!input.orderid) {
    return result;
  }

  console.log("Checking for pool...");
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.CONNECT_STRING_MICROSERVICE,
    });
    console.log("Pool created...");
  }

  const dueMinutes = Number(process.env.DUEMINUTES);
  const URL = process.env.VBCSURI;
  const UUID = uuidv4();
  const now = moment();
  const duedatetime = now.add(dueMinutes, 'minutes');
  const connection = await pool.getConnection();
  const sql = `insert into polluuid(uuid,orderid,duedatetime,used) values (:uuid,:orderid,:datetime,'N')`;
  const bindings = [UUID,input.orderid,duedatetime.format('YYYY-MM-DDTHH:mm:ssZ')];
  console.log("Invoking sql...");
  await connection.execute(sql, bindings, { autoCommit: true });
  console.log("sql invoked...");
  result.uuid = UUID;
  result.uri = URL + `?uuid=${UUID}`;
  result.duedatetime = duedatetime.format('DD-MMM-YYYY HH:mm:ss Z');
  console.log("Returning...");
  return result;
})
