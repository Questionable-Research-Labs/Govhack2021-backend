import express from "express";
import dotenv from "dotenv";
import { Octokit } from "octokit";
import { env } from "process";
import cors from "cors";
import admin from "firebase-admin";

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
let registrationTokens: string[] = [];

const octokit = new Octokit({ auth: env.API_KEY, userAgent: "toiv0.1.0" });
const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

interface GitHubFileRequest {
  owner: string;
  repoName: string;
  path: string;
  branch: string;
}

const createRequest = (request: GitHubFileRequest) => `{
  repository(owner: "${request.owner}", name: "${request.repoName}") {
    ref(qualifiedName: "refs/heads/${request.branch}") {
      target {
        ... on Commit {
          history(first: 1, path: "${request.path}") {
            edges {
              node {
                committedDate
              }
            }
          }
        }
      }
    }
  }
}`;

const updateDatePushed = async () => {
  let request: any = await octokit.graphql(
    createRequest({
      owner: "Questionable-Research-Labs",
      repoName: "Govhack2021-backend",
      path: "src/index.ts",
      branch: "main",
    })
  );

  if (request?.repository?.ref?.target?.history?.edges.length > 0) {
    let newDatePushed =
      request?.repository?.ref?.target?.history?.edges[0]?.node?.committedDate;

    if (datePushed !== "" && newDatePushed !== datePushed) {
      console.log("Holey fucking shit we did a thing");
    }

    if (
      datePushed !== "" &&
      newDatePushed !== datePushed &&
      registrationTokens.length > 0
    ) {
      const message: admin.messaging.MulticastMessage = {
        data: {},
        tokens: registrationTokens,
      };

      // Send a message to the device corresponding to the provided
      // registration token.
      admin
        .messaging()
        .sendMulticast(message)
        .then((response) => {
          // Response is a message ID string.
          console.log("Successfully sent ", response.successCount, " messages");
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    }

    datePushed = newDatePushed;
  }
};

updateDatePushed();

// setInterval(updateDatePushed, 30 * 1000 * 60);
setInterval(updateDatePushed, 1000);

app.get("/updated", (req, res) => {
  res.send(
    JSON.stringify({
      datePushed: datePushed,
    })
  );
});

app.post("/push-notification/:token", (req, res) => {
  let token = req.params.token;
  registrationTokens.push(token);
  console.log("Adding token ", token);
  res.send("Ok");
});

app.delete("/push-notification/:token", (req, res) => {
  let token = req.params.token;
  registrationTokens = registrationTokens.filter((e) => e != token);
  console.log("Removing token", token, "\nTokens are", registrationTokens);
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
