import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "it-tickets",
  eventKey: process.env.INNGEST_EVENT_KEY,
  serverUrl: process.env.INNGEST_SERVER_URL,
});
