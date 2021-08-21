import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { Octokit } from "octokit";
import { env } from "process";
import cors from "cors";
import admin from "firebase-admin";
import { addRegistrationToken, getRegistrationTokens } from "./firebase";
import { createRequest, graphql } from "./github";

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

const updateDatePushed = async () => {
  let request: any = await graphql(
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
      getRegistrationTokens().length > 0
    ) {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: "New Covid19 Locations of interest",
          body: "The Covid19 locations of interest have been updated, check the app to see if there are any around you.",
        },
        tokens: getRegistrationTokens(),
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
  addRegistrationToken(token);
  console.log("Adding token ", token);
  res.send("Ok");
});

app.delete("/push-notification/:token", async (req, res) => {
  let token = req.params.token;
  // Remove from list of tokens
  removeRegistrationToken(token);
  console.log("Removing token", token);
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Toi Backend running on http://localhost:${port}`);
});
