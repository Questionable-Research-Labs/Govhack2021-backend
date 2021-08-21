import express from "express";
import dotenv from "dotenv";
import { Octokit } from "octokit";
import { env } from "process";
import cors from "cors";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://govhack2021.fallstop.workers.dev",
    ],
  })
);
const port = 5000;

let datePushed: string = "";

const octokit = new Octokit({ auth: env.API_KEY, userAgent: "toiv0.1.0" });

const updateDatePushed = async () => {
  let commitsResponse = await octokit.request(
    "GET /repos/minhealthnz/nz-covid-data/commits?path=locations-of-interest%2Faugust-2021%2Flocations-of-interest.geojson&page=1&per_page=1"
  );

  if (commitsResponse.status === 200) {
    let commits = commitsResponse.data;
    let newDatePushed = commits[0].commit.author.date;

    if (newDatePushed !== datePushed) {
      // TODO: Implement push notifications
    }

    datePushed = newDatePushed;
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
