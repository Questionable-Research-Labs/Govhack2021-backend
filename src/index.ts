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

// Pro tip: Generate a personal access token!
const octokit = new Octokit({ auth: env.API_KEY, userAgent: "toiv0.1.0" });
const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Decide wether in dev enviourment or production env (if there ever was a difference)
const docName = env.DEV ? "devTokens" : "tokens";

// Get a reference to the firebase tokens
let docRef = db.collection("registrationTokens").doc(docName);

// Get tokens from firestore
(async () => {
  let doc = await docRef.get();
  registrationTokens = doc.data()["tokens"];
  console.log("Fetched tokens from firesotre", registrationTokens);
})();

interface GitHubFileRequest {
  owner: string;
  repoName: string;
  path: string;
  branch: string;
}

// Function to build query for GitHub to get latest commit date
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
      owner: "minhealthnz",
      repoName: "nz-covid-data",
      path: "locations-of-interest/august-2021/locations-of-interest.geojson",
      branch: "main",
    })
  );

  // Cancer.
  if (request?.repository?.ref?.target?.history?.edges.length > 0) {
    let newDatePushed =
      request?.repository?.ref?.target?.history?.edges[0]?.node?.committedDate;

    // Check to see if the date has updated
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

setInterval(updateDatePushed, 15 * 1000 * 60);
// setInterval(updateDatePushed, 1000);

app.get("/updated", (req, res) => {
  res.send(
    JSON.stringify({
      datePushed: datePushed,
    })
  );
});

app.post("/push-notification/:token", async (req, res) => {
  let token = req.params.token;
  // Add to list of tokens
  registrationTokens.push(token);
  console.log("Adding token ", token);
  res.send("Ok");

  // Update firesotre
  await docRef.set({
    tokens: registrationTokens,
  });
});

app.delete("/push-notification/:token", async (req, res) => {
  let token = req.params.token;
  // Remove from list of tokens
  registrationTokens = registrationTokens.filter((e) => e != token);
  console.log("Removing token", token, "\nTokens are", registrationTokens);
  res.send("Ok");

  // Update firestore
  await docRef.set({
    tokens: registrationTokens,
  });
});

app.listen(port, () => {
  console.log(`Toi Backend running on http://localhost:${port}`);
});
