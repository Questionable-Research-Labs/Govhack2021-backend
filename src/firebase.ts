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
const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT);

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
  registrationTokens = new Set(
    docData["tokens"].filter((e: string) => e !== "")
  );
  doc = await datasetInfoDocRef.get();
  docData = doc.data();
  datasetInfo =
    typeof docData === "undefined"
      ? {
          loiCount: 0,
          pushedDate: "",
        }
      : {
          loiCount:
            typeof docData["loiCount"] === "undefined"
              ? 0
              : docData["loiCount"],
          pushedDate:
            typeof docData["pushedDate"] === "undefined"
              ? ""
              : docData["pushedDate"],
        };
  console.log("Fetched tokens from firesotre", registrationTokens);
})();

/** Updates the tokens stored in firestore to match local data */
const updateFirestore = async () =>
  tokensDocRef.set({
    tokens: registrationTokens,
  });

/** Gets all the registration tokens */
export const getRegistrationTokens = () => Array.from(registrationTokens);

/** Add a registration token */
export const addRegistrationToken = async (token: string) => {
  registrationTokens.add(token);
  await updateFirestore();
};

/** Remove a registration token */
export const removeRegistrationToken = async (token: string) => {
  registrationTokens = new Set(
    Array.from(registrationTokens).filter((e) => e !== token)
  );
  await updateFirestore();
};

export const loiCountDelta = async () => {
  let response = await axios.get(
    "https://raw.githubusercontent.com/minhealthnz/nz-covid-data/main/locations-of-interest/august-2021/locations-of-interest.geojson"
  );
  if (response.status === 200) {
    let newLoiCount = response.data["features"].length;
    let loiCount = datasetInfo.loiCount;

    datasetInfo = {
      ...datasetInfo,
      loiCount: newLoiCount,
    };

    await datasetInfoDocRef.set(datasetInfo);

    return newLoiCount - loiCount;
  }
};

export const getLoiCount = () => datasetInfo.loiCount;

export const setDatePushed = async (date: string) => {
  datasetInfo = {
    ...datasetInfo,
    pushedDate: date,
  };
  console.log(date);
  console.log(datasetInfo);
  await datasetInfoDocRef.set(datasetInfo);
};

export const getDatePushed = () => datasetInfo.pushedDate;
