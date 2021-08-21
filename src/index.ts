import express from "express";
import dotenv from "dotenv";
import { Octokit, App } from "octokit";
import { env } from "process";

dotenv.config();

const app = express();
const port = 5000;

let datePushed: string = "";

const octokit = new Octokit({ auth: env.API_KEY, userAgent: "toiv0.1.0" });

const updateDatePushed = async () => {
  let commitsResponse = await octokit.request(
    "GET /repos/minhealthnz/nz-covid-data/commits?path=locations-of-interest%2Faugust-2021%2Flocations-of-interest.geojson&page=1&per_page=1"
  );

  if (commitsResponse.status === 200) {
    let commits = commitsResponse.data;
    datePushed = commits[0].commit.author.date;
  }
};

updateDatePushed();

setInterval(updateDatePushed, 30 * 1000 * 60);

app.get("/updated", (req, res) => {
  res.send(
    JSON.stringify({
      datePushed: datePushed,
    })
  );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
