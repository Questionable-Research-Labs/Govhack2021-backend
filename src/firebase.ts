import admin from "firebase-admin";
import { env } from "process";
import { config } from "dotenv";
import axios from "axios";

interface DatasetInfo {
  loiCount: number;
  pushedDate: string;
}

// Load .env file
config();

let registrationTokens: Set<string> = new Set();

// Get the account creds from the enjoinment valuables
const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT ?? "{}");

// Initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get a reference to firestore
const db = admin.firestore();

// Decide wether in dev enviourment or production env (if there ever was a difference)
const tokensDocName = env.DEV ? "devTokens" : "tokens";

// Get a reference to the tokens on firebase
let tokensDocRef = db.collection("registrationTokens").doc(tokensDocName);

// Decide wether in dev enviourment or production env (if there ever was a difference)
const datasetInfoDocName = env.DEV ? "devInfo" : "info";

// Get a reference to the tokens on firebase
let datasetInfoDocRef = db.collection("datasetInfo").doc(datasetInfoDocName);

// Get the number of locations of interest
let datasetInfo: DatasetInfo;

// Get tokens from firestore
(async () => {
  let doc = await tokensDocRef.get();
  let docData = doc.data();
  registrationTokens =
    typeof docData !== "undefined"
      ? new Set(docData["tokens"].filter((e: string) => e !== ""))
      : new Set();
  doc = await datasetInfoDocRef.get();
  docData = doc.data();
  datasetInfo =
    typeof docData === "undefined"
      ? {
          loiCount: 0,
          pushedDate: "",
        }
      : {
          loiCount: docData["loiCount"] ?? 0,
          pushedDate: docData["pushedDate"] ?? "",
        };
  console.log("Fetched tokens from firesotre", registrationTokens);
  console.log("dataset info", datasetInfo);
})();

/** Updates the tokens stored in firestore to match local data */
const updateFirestoreTokens = async () =>
  tokensDocRef.set({
    tokens: Array.from(registrationTokens),
  });

/** Gets all the registration tokens */
export const getRegistrationTokens = () => Array.from(registrationTokens);

/** Add a registration token */
export const addRegistrationToken = async (token: string) => {
  registrationTokens.add(token);
  await updateFirestoreTokens();
};

/** Remove a registration token */
export const removeRegistrationToken = async (token: string) => {
  registrationTokens = new Set(
    Array.from(registrationTokens).filter((e) => e !== token)
  );
  await updateFirestoreTokens();
};

/** Get difference in the number of locations in interest from previous commit vs now */
export const loiCountDelta = async () => {
  let response = await axios.get(
    "https://raw.githubusercontent.com/minhealthnz/nz-covid-data/main/locations-of-interest/august-2021/locations-of-interest.geojson"
  );
  if (response.status === 200) {
    let newLoiCount = response.data.features.length;
    let loiCount = datasetInfo.loiCount;

    datasetInfo = {
      ...datasetInfo,
      loiCount: newLoiCount,
    };

    await datasetInfoDocRef.set(datasetInfo);

    console.log("New:", newLoiCount, "Old:", loiCount);

    return newLoiCount - loiCount;
  }
};

/** Get locations of interest count */
export const getLoiCount = () => datasetInfo.loiCount;

/** Update the date of the latest commit to the data */
export const setDatePushed = async (date: string) => {
  datasetInfo = {
    ...datasetInfo,
    pushedDate: date,
  };
  await datasetInfoDocRef.set(datasetInfo);
};

/** Get the date the of the latest commit to the dataset */
export const getDatePushed = () => datasetInfo.pushedDate;
