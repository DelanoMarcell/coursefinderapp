require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your OpenAI Assistant ID (from the OpenAI dashboard)
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { query } = req.body;

    // Create a thread with the user's question
    const thread = await openai.beta.threads.create();

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: query,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Wait for the run to complete
    let retrieveRun;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retrieveRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (retrieveRun.status !== "completed");

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantResponse = messages.data
      .filter((m) => m.role === "assistant" && m.content[0].type === "text")
      .pop();

    if (!assistantResponse) {
      return res.status(500).json({ error: "No response from assistant" });
    }

    res.json({
      response: assistantResponse.content[0].text.value,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
