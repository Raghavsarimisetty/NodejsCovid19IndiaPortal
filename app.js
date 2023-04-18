const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authentication = (req, res, next) => {
  const header = req.headers.authorization;
  if (header === undefined) {
    console.log("undefined");
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    let jwtToken;
    jwtToken = header.split(" ")[1];
    console.log(jwtToken);
    jwt.verify(jwtToken, "SECRET_KEY", async (error, user) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const getUserQuery = `select * from user where username = "${username}";`;
  let jwtToken;
  const responseQuery = await db.get(getUserQuery);

  if (responseQuery !== undefined) {
    const authenticatePassword = await bcrypt.compare(
      password,
      responseQuery.password
    );
    if (authenticatePassword) {
      const payload = { username: username };
      jwtToken = await jwt.sign(payload, "SECRET_KEY");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  } else {
    console.log(responseQuery);
    res.status(400);
    res.send("Invalid user");
  }
});

// get states api
app.get("/states/", authentication, async (req, res) => {
  const statesQuery = `select state_id as stateId,state_name as stateName,population from state;`;
  const response = await db.all(statesQuery);
  res.send(response);
});
// get state api with id

app.get("/states/:stateId", authentication, async (req, res) => {
  const { stateId } = req.params;
  const statesQuery = `select state_id as stateId,state_name as stateName,population from state where state_id = ${stateId} ;`;
  const response = await db.get(statesQuery);
  res.send(response);
});

//api 4 create a district in district table

app.post("/districts/", authentication, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const districtQuery = `insert into district(district_name,state_id,cases,cured,active,deaths) values("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  const response = await db.run(districtQuery);
  res.send("District Successfully Added");
});

//api 5 get district id based on request id
app.get("/districts/:districtId", authentication, async (req, res) => {
  const { districtId } = req.params;
  const districtQuery = `select district_id as districtId,district_name as districtName,state_id as stateId,cases,cured,active,deaths from district where district_id = ${districtId} ;`;
  const response = await db.get(districtQuery);
  res.send(response);
});

//api 6 delete district based on Id

app.delete("/districts/:districtId", authentication, async (req, res) => {
  const { districtId } = req.params;
  const districtQuery = `delete from district where district_id = ${districtId}`;
  const response = await db.run(districtQuery);
  res.send("District Removed");
});

//api 7 put district based on Id

app.put("/districts/:districtId", authentication, async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const districtQuery = `update district set district_name = "${districtName}",state_id = ${stateId},cases = ${cases},cured = ${cured},active = ${active},deaths = ${deaths} where district_id = ${districtId} ;`;
  const response = await db.get(districtQuery);
  res.send("District Details Updated");
});

// api 8 get stats based on stateId

app.get("/states/:stateId/stats", authentication, async (req, res) => {
  const { stateId } = req.params;
  const statesQuery = `select sum(cases) as totalCases,sum(cured) as totalCured,sum(active) as totalActive,sum(deaths) as totalDeaths from district where state_id = ${stateId} ;`;
  const response = await db.get(statesQuery);
  res.send(response);
});

module.exports = app;
