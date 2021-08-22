import express, { application } from "express";
import axios from "axios";
import cors from "cors";
import admin from "firebase-admin";
import {
  addRegistrationToken,
  getDatePushed,
  setDatePushed,
  getRegistrationTokens,
  loiCountDelta,
  removeRegistrationToken,
  getLoiCount,
} from "./firebase";
import { createRequest, graphql } from "./github";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://toi.qrl.nz"],
  })
);

const port = 5000;

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
    let newPushedDate =
      request?.repository?.ref?.target?.history?.edges[0]?.node?.committedDate;

    let pushedDate = getDatePushed();

    console.log("New: ", newPushedDate, "Old", pushedDate);

    if (pushedDate == "") {
      loiCountDelta();
    }
    // Check to see if the date has updated
    if (
      pushedDate !== "" &&
      newPushedDate !== pushedDate &&
      getRegistrationTokens().length > 0
    ) {
      let loiDelta = await loiCountDelta();
      console.log(loiDelta);
      if (loiDelta !== 0) {
        const message: admin.messaging.MulticastMessage = {
          notification: {
            title: "New COVID-19 Locations of interest",
            body: `There are ${loiDelta} new COVID-19 locations of interest, check the app to see if there are any around you.`,
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
            console.log(
              "Successfully sent ",
              response.successCount,
              " messages"
            );
          })
          .catch((error) => {
            console.log("Error sending message:", error);
          });
      }
    }

    console.log(newPushedDate);

    setDatePushed(newPushedDate);
    console.log("Updated data");
  }
};

setTimeout(updateDatePushed, 3000);

setInterval(updateDatePushed, 15 * 1000 * 60);
// setInterval(updateDatePushed, 3000);

app.get("/updated", (req, res) => {
  res.send(
    JSON.stringify({
      getDatePushed: getDatePushed(),
    })
  );
});

// DEPRECATED
// also this is lines of interest, not loli
app.get("/loi", (req, res) => {
  res.send(
    JSON.stringify({
      loi: getLoiCount(),
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
