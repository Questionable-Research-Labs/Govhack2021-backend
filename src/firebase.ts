import admin from "firebase-admin";
import { env } from "process";

let registrationTokens: string[] = [];

// Get the account creds from the enjoinment valuables
const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT);

// Initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get a reference to firestore
const db = admin.firestore();

// Decide wether in dev enviourment or production env (if there ever was a difference)
const docName = env.DEV ? "devTokens" : "tokens";

// Get a reference to the firebase tokens
let docRef = db.collection("registrationTokens").doc(docName);

// Get tokens from firestore
(async () => {
  let doc = await docRef.get();
  registrationTokens = doc.data()["tokens"].filter((e: string) => e !== "");
  console.log("Fetched tokens from firesotre", registrationTokens);
})();

/** Updates the tokens stored in firestore to match local data */
const updateFirestore = async () =>
  docRef.set({
    tokens: registrationTokens,
  });

/** Gets all the registration tokens */
export const getRegistrationTokens = () => registrationTokens;

/** Add a registration token */
export const addRegistrationToken = async (token: string) => {
  registrationTokens.push(token);
  await updateFirestore();
};

/** Remove a registration token */
export const removeRegistrationToken = async (token: string) => {
  registrationTokens = registrationTokens.filter((e) => e !== token);
  await updateFirestore();
};
